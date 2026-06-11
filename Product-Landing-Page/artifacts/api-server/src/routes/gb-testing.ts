import { Router, type IRouter } from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import {
  groupBuysTable,
  gbTestingRoundsTable,
  gbTestingVotesTable,
  ordersTable,
  orderLineItemsTable,
  groupBuyProductsTable,
  productsTable,
} from "@workspace/db";
import { eq, and, gt, sum, count, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { getJwtSecret, type AccountJwtPayload } from "../middleware/account-auth";
import { timingSafeEqual } from "crypto";
import { extractBatchNumbersFromImages } from "../lib/gemini-lab-extract";

// Optional account auth: decode the cookie if present, but don't 401 if missing.
function loadOptionalAccount(req: import("express").Request): void {
  if (req.account) return;
  const token = (req.cookies as Record<string, string> | undefined)?.account_session;
  if (!token) return;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AccountJwtPayload;
    req.account = { telegramUsername: payload.telegramUsername, jti: payload.jti };
  } catch { /* ignore invalid/expired tokens */ }
}

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype);
    cb(null, ok);
  },
});

function isAdminRequest(req: import("express").Request): boolean {
  const secret = process.env["ADMIN_SECRET"];
  if (!secret) return false;
  const provided = req.headers["x-admin-secret"];
  if (!provided || typeof provided !== "string") return false;
  try {
    const bufA = Buffer.from(provided, "utf8");
    const bufB = Buffer.from(secret, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch { return false; }
}
import {
  PEPTIDE_NAMES,
  ENDOTOXIN_PRICE,
  VIAL_PRICE,
  MAX_VIALS,
  computeThresholds,
  computeMilestones,
  ALL_TEST_OPTION_NAMES,
  DEFAULT_TEST_OPTIONS,
} from "../lib/janoshik-prices";

const router: IRouter = Router();

// ── helpers ───────────────────────────────────────────────────

function nanoid() {
  return Math.random().toString(36).substring(2, 12) +
    Math.random().toString(36).substring(2, 12);
}

// Derive the leading compound, vial count, and test order from votes.
function getLeadingVote(votes: { peptideName: string; vialCount: number; testSelections: string[] }[]): {
  peptideName: string | null;
  vialCount: number;
  testOrder: string[]; // most-voted tests first
} {
  if (votes.length === 0) return { peptideName: null, vialCount: 1, testOrder: [] };

  // Leading compound
  const peptideCounts: Record<string, number> = {};
  for (const v of votes) {
    peptideCounts[v.peptideName] = (peptideCounts[v.peptideName] ?? 0) + 1;
  }
  const topPeptide = Object.entries(peptideCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Leading vial count
  const vialCounts: Record<number, number> = {};
  for (const v of votes) {
    vialCounts[v.vialCount] = (vialCounts[v.vialCount] ?? 0) + 1;
  }
  const topVials = parseInt(
    Object.entries(vialCounts).sort((a, b) => b[1] - a[1])[0][0],
    10
  );

  // Test vote counts — each member's testSelections contribute one vote per test
  const testCounts: Record<string, number> = {};
  for (const v of votes) {
    const selections = Array.isArray(v.testSelections) ? v.testSelections : [];
    for (const t of selections) {
      testCounts[t] = (testCounts[t] ?? 0) + 1;
    }
  }
  const testOrder = Object.entries(testCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return { peptideName: topPeptide, vialCount: topVials, testOrder };
}

// ── GET /api/group-buys/:gbId/info — lightweight public GB info ─
router.get("/group-buys/:gbId/info", async (req, res): Promise<void> => {
  const { gbId } = req.params;
  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, status: groupBuysTable.status })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  res.json(gb);
});

// ── GET /api/group-buys/:gbId/testing ─────────────────────────
router.get("/group-buys/:gbId/testing", async (req, res): Promise<void> => {
  loadOptionalAccount(req);
  const { gbId } = req.params;

  const [round] = await db
    .select()
    .from(gbTestingRoundsTable)
    .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
    .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
    .limit(1);

  if (!round) {
    res.json({ round: null, poolTotal: 0, votes: [], thresholds: null, hasVoted: false, isOptedIn: false, hasGbOrder: false });
    return;
  }

  // openMode: skip contribution check only when payment is tracked externally (Janoshik URL).
  // anyContribution (late opt-in) still writes testingContribution on the order, so the
  // contribution check remains in place for that mode.
  const openMode = !!(round.janoshikPaymentUrl as string | null);

  // Pool total
  const [poolRow] = await db
    .select({ total: sum(ordersTable.testingContribution) })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.groupBuyId, gbId),
        gt(ordersTable.testingContribution, "0")
      )
    );

  const poolTotal = parseFloat((poolRow?.total as string) ?? "0") || 0;

  // Vote aggregation
  const voteRows = await db
    .select({
      peptideName: gbTestingVotesTable.peptideName,
      vialCount: gbTestingVotesTable.vialCount,
      testSelections: gbTestingVotesTable.testSelections,
    })
    .from(gbTestingVotesTable)
    .where(eq(gbTestingVotesTable.roundId, round.id));

  const voteSummary: Record<string, { totalVotes: number; vials: Record<number, number> }> = {};
  for (const v of voteRows) {
    if (!voteSummary[v.peptideName]) {
      voteSummary[v.peptideName] = { totalVotes: 0, vials: {} };
    }
    voteSummary[v.peptideName].totalVotes += 1;
    voteSummary[v.peptideName].vials[v.vialCount] = (voteSummary[v.peptideName].vials[v.vialCount] ?? 0) + 1;
  }

  const votes = Object.entries(voteSummary)
    .map(([peptideName, data]) => ({ peptideName, ...data }))
    .sort((a, b) => b.totalVotes - a.totalVotes);

  // Aggregate test type votes and vial vote distribution
  const testVotes: Record<string, number> = {};
  const vialVotes: Record<string, number> = {};
  for (const v of voteRows) {
    const sels = Array.isArray(v.testSelections) ? v.testSelections : [];
    for (const t of sels) { testVotes[t] = (testVotes[t] ?? 0) + 1; }
    const vk = String(v.vialCount);
    vialVotes[vk] = (vialVotes[vk] ?? 0) + 1;
  }

  const leading = getLeadingVote(voteRows as { peptideName: string; vialCount: number; testSelections: string[] }[]);

  // Use round's testOptions as the ballot; if votes have arrived use vote-derived order,
  // otherwise fall back to ballot order as-is
  const configuredTestOptions = (round.testOptions && Array.isArray(round.testOptions) && round.testOptions.length > 0)
    ? round.testOptions as string[]
    : DEFAULT_TEST_OPTIONS;

  const testOrder = leading.testOrder.length > 0
    ? leading.testOrder.filter(t => configuredTestOptions.includes(t))
    : configuredTestOptions;

  const milestones = computeMilestones(leading.peptideName, leading.vialCount, testOrder);
  const thresholds = computeThresholds(leading.peptideName, leading.vialCount);

  // Resolve opt-in & vote status
  let hasVoted = false;
  let existingVote: { peptideName: string; vialCount: number; testSelections: string[] } | null = null;
  let isOptedIn = isAdminRequest(req); // admins always see the full pool

  if (req.account) {
    const tg = req.account.telegramUsername;
    const tgBare = tg.startsWith("@") ? tg.slice(1) : tg;
    const tgAt  = tg.startsWith("@") ? tg : `@${tg}`;

    // In open mode any GB order qualifies; otherwise must have testingContribution > 0
    const orderConditions = openMode
      ? and(
          eq(ordersTable.groupBuyId, gbId),
          sql`lower(${ordersTable.telegramUsername}) IN (lower(${tgBare}), lower(${tgAt}))`
        )
      : and(
          eq(ordersTable.groupBuyId, gbId),
          gt(ordersTable.testingContribution, "0"),
          sql`lower(${ordersTable.telegramUsername}) IN (lower(${tgBare}), lower(${tgAt}))`
        );

    const [accountOrder] = await db
      .select({ id: ordersTable.id, testingContribution: ordersTable.testingContribution })
      .from(ordersTable)
      .where(orderConditions)
      .limit(1);

    if (accountOrder) {
      isOptedIn = true;
      const [vote] = await db
        .select({
          peptideName: gbTestingVotesTable.peptideName,
          vialCount: gbTestingVotesTable.vialCount,
          testSelections: gbTestingVotesTable.testSelections,
        })
        .from(gbTestingVotesTable)
        .where(
          and(
            eq(gbTestingVotesTable.roundId, round.id),
            eq(gbTestingVotesTable.orderId, accountOrder.id)
          )
        );
      if (vote) {
        hasVoted = true;
        existingVote = vote as { peptideName: string; vialCount: number; testSelections: string[] };
      }
    }
  }

  // hasGbOrder: user has an order in this GB but hasn't opted into testing
  let hasGbOrder = false;
  if (req.account && !isOptedIn) {
    const tg = req.account.telegramUsername;
    const tgBare = tg.startsWith("@") ? tg.slice(1) : tg;
    const tgAt  = tg.startsWith("@") ? tg : `@${tg}`;
    const [gbOrder] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.groupBuyId, gbId),
        sql`lower(${ordersTable.telegramUsername}) IN (lower(${tgBare}), lower(${tgAt}))`
      ))
      .limit(1);
    if (gbOrder) hasGbOrder = true;
  }

  // Fetch GB's linked products so all compounds in the GB appear in the ballot
  const gbProductRowsCustomer = await db
    .select({ name: productsTable.name })
    .from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(and(eq(groupBuyProductsTable.groupBuyId, gbId), eq(groupBuyProductsTable.active, true)));
  const gbProductNamesCustomer = gbProductRowsCustomer.map(p => p.name).filter(Boolean);
  const allKnownPeptides = [...new Set([...PEPTIDE_NAMES, ...gbProductNamesCustomer])].sort();

  const peptideOptions = (round.voteOptions && Array.isArray(round.voteOptions) && round.voteOptions.length > 0)
    ? round.voteOptions as string[]
    : allKnownPeptides;

  res.json({
    round: {
      id: round.id,
      status: round.status,
      contributionAmount: parseFloat(round.contributionAmount as string),
      anyContribution: !!(round.anyContribution),
      lateOptInEnabled: !!(round.lateOptInEnabled),
      resultNotes: round.resultNotes,
      resultPdfUrl: round.resultPdfUrl,
      resultPostedAt: round.resultPostedAt,
      voteOptions: round.voteOptions ?? null,
      testOptions: configuredTestOptions,
      janoshikPaymentUrl: (round.janoshikPaymentUrl as string | null) ?? null,
      labShippingCost: (round as any).labShippingCost ? parseFloat((round as any).labShippingCost as string) : null,
    },
    poolTotal,
    contributorCount: (await db
      .select({ c: count() })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.groupBuyId, gbId),
          gt(ordersTable.testingContribution, "0")
        )
      ))[0]?.c ?? 0,
    votes,
    totalVotes: voteRows.length,
    milestones,
    thresholds: {
      tier1: thresholds.tier1,
      tier2: thresholds.tier2,
      peptidePrice: thresholds.peptidePrice,
      leadingPeptide: leading.peptideName,
      leadingVials: leading.vialCount,
      testOrder,
    },
    hasVoted,
    existingVote,
    isOptedIn,
    hasGbOrder,
    peptideOptions,
    peptideBatches: ((round as any).peptideBatches as Record<string, string> | null) ?? {},
    testOptions: configuredTestOptions,
    testVotes,
    vialVotes,
    endotoxinPrice: ENDOTOXIN_PRICE,
    vialPrice: VIAL_PRICE,
    maxVials: MAX_VIALS,
  });
});

// ── POST /api/group-buys/:gbId/testing/vote ───────────────────
router.post("/group-buys/:gbId/testing/vote", async (req, res): Promise<void> => {
  const { gbId } = req.params;
  const { peptideName, vialCount, testSelections } = req.body;

  if (!peptideName || !vialCount) {
    res.status(400).json({ error: "peptideName and vialCount are required" });
    return;
  }
  const cleanPeptide = String(peptideName).trim();
  const cleanVials = Math.max(1, Math.min(MAX_VIALS, parseInt(String(vialCount), 10) || 1));
  const cleanTests: string[] = Array.isArray(testSelections)
    ? testSelections.map(String).filter(Boolean)
    : [];

  loadOptionalAccount(req);
  if (!req.account) {
    res.status(401).json({ error: "Sign in to cast your vote" });
    return;
  }

  const tg = req.account.telegramUsername;
  const tgBare = tg.startsWith("@") ? tg.slice(1) : tg;
  const tgAt  = tg.startsWith("@") ? tg : `@${tg}`;

  const [round] = await db
    .select({
      id: gbTestingRoundsTable.id,
      status: gbTestingRoundsTable.status,
      createdAt: gbTestingRoundsTable.createdAt,
      voteOptions: gbTestingRoundsTable.voteOptions,
      testOptions: gbTestingRoundsTable.testOptions,
      janoshikPaymentUrl: gbTestingRoundsTable.janoshikPaymentUrl,
      anyContribution: gbTestingRoundsTable.anyContribution,
    })
    .from(gbTestingRoundsTable)
    .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
    .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
    .limit(1);

  if (!round) {
    res.status(404).json({ error: "No testing round found for this group buy" });
    return;
  }
  if (round.status === "results_received") {
    res.status(400).json({ error: "Voting is closed — results have been posted" });
    return;
  }

  // Build allowed peptides: admin-configured list OR all known (hardcoded + GB products)
  const gbProductRowsVote = await db
    .select({ name: productsTable.name })
    .from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(and(eq(groupBuyProductsTable.groupBuyId, gbId), eq(groupBuyProductsTable.active, true)));
  const gbProductNamesVote = gbProductRowsVote.map(p => p.name).filter(Boolean);
  const allKnownPeptidesVote = [...new Set([...PEPTIDE_NAMES, ...gbProductNamesVote])];

  const allowedPeptides = (round.voteOptions && Array.isArray(round.voteOptions) && round.voteOptions.length > 0)
    ? round.voteOptions as string[]
    : allKnownPeptidesVote;
  if (!allowedPeptides.includes(cleanPeptide)) {
    res.status(400).json({ error: "Invalid peptide selection" });
    return;
  }

  const allowedTests = (round.testOptions && Array.isArray(round.testOptions) && round.testOptions.length > 0)
    ? round.testOptions as string[]
    : DEFAULT_TEST_OPTIONS;
  const validTests = cleanTests.filter(t => allowedTests.includes(t));

  // janoshikPaymentUrl = external payment not tracked on the order, so skip the contribution check.
  // anyContribution = late opt-in that DOES write testingContribution on the order, so still require it.
  const externalPaymentMode = !!(round.janoshikPaymentUrl as string | null);

  const orderConditionsVote = externalPaymentMode
    ? and(
        eq(ordersTable.groupBuyId, gbId),
        sql`lower(${ordersTable.telegramUsername}) IN (lower(${tgBare}), lower(${tgAt}))`
      )
    : and(
        eq(ordersTable.groupBuyId, gbId),
        gt(ordersTable.testingContribution, "0"),
        sql`lower(${ordersTable.telegramUsername}) IN (lower(${tgBare}), lower(${tgAt}))`
      );

  const [order] = await db
    .select({ id: ordersTable.id, groupBuyId: ordersTable.groupBuyId, testingContribution: ordersTable.testingContribution })
    .from(ordersTable)
    .where(orderConditionsVote)
    .limit(1);

  if (!order) {
    res.status(403).json({ error: "You need an order in this group buy to vote." });
    return;
  }

  const existing = await db
    .select({ id: gbTestingVotesTable.id })
    .from(gbTestingVotesTable)
    .where(
      and(
        eq(gbTestingVotesTable.roundId, round.id),
        eq(gbTestingVotesTable.orderId, order.id)
      )
    );

  if (existing.length > 0) {
    await db
      .update(gbTestingVotesTable)
      .set({ peptideName: cleanPeptide, vialCount: cleanVials, testSelections: validTests })
      .where(
        and(
          eq(gbTestingVotesTable.roundId, round.id),
          eq(gbTestingVotesTable.orderId, order.id)
        )
      );
  } else {
    await db.insert(gbTestingVotesTable).values({
      roundId: round.id,
      orderId: order.id,
      gbId,
      peptideName: cleanPeptide,
      vialCount: cleanVials,
      testSelections: validTests,
    });
  }

  res.json({ ok: true, updated: existing.length > 0 });
});

// ── POST /api/group-buys/:gbId/testing/contribute — late opt-in ──
router.post("/group-buys/:gbId/testing/contribute", async (req, res): Promise<void> => {
  loadOptionalAccount(req);
  if (!req.account) {
    res.status(401).json({ error: "Sign in to contribute" });
    return;
  }
  const { gbId } = req.params;
  const tg = req.account.telegramUsername;
  const tgBare = tg.startsWith("@") ? tg.slice(1) : tg;
  const tgAt  = tg.startsWith("@") ? tg : `@${tg}`;

  const [round] = await db
    .select()
    .from(gbTestingRoundsTable)
    .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
    .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
    .limit(1);

  if (!round) { res.status(404).json({ error: "No testing round found" }); return; }
  if (round.status !== "active") { res.status(400).json({ error: "Round is not accepting contributions" }); return; }
  if (!round.anyContribution && !round.lateOptInEnabled) {
    res.status(403).json({ error: "Late opt-in is not currently open for this round" });
    return;
  }

  const [order] = await db
    .select({ id: ordersTable.id, testingContribution: ordersTable.testingContribution })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      sql`lower(${ordersTable.telegramUsername}) IN (lower(${tgBare}), lower(${tgAt}))`
    ))
    .limit(1);

  if (!order) { res.status(403).json({ error: "No order found in this group buy" }); return; }

  const existing = parseFloat(String(order.testingContribution ?? "0")) || 0;
  if (existing > 0) { res.status(400).json({ error: "You have already contributed to this round" }); return; }

  const amount = round.anyContribution
    ? parseFloat(String((req.body as { amount?: string }).amount || "0")) || 15
    : parseFloat(String(round.contributionAmount));

  await db
    .update(ordersTable)
    .set({ testingContribution: String(amount.toFixed(2)) })
    .where(eq(ordersTable.id, order.id));

  res.json({ ok: true, amount });
});

// ── Admin: GET /api/admin/group-buys/:gbId/testing ────────────
router.get("/admin/group-buys/:gbId/testing", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  const rounds = await db
    .select()
    .from(gbTestingRoundsTable)
    .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
    .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`);

  if (rounds.length === 0) {
    res.json({ round: null });
    return;
  }

  const round = rounds[0];

  const voteRows = await db
    .select()
    .from(gbTestingVotesTable)
    .where(eq(gbTestingVotesTable.roundId, round.id));

  const [poolRow] = await db
    .select({ total: sum(ordersTable.testingContribution), contributors: count() })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.groupBuyId, gbId),
        gt(ordersTable.testingContribution, "0")
      )
    );

  const contributorRows = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      testingContribution: ordersTable.testingContribution,
      paymentStatus: ordersTable.paymentStatus,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.groupBuyId, gbId),
        gt(ordersTable.testingContribution, "0")
      )
    )
    .orderBy(ordersTable.createdAt);

  const voteOrderIds = new Set(voteRows.map(v => v.orderId));
  const contributors = contributorRows.map(o => ({
    orderId: o.id,
    code: o.code,
    telegramUsername: o.telegramUsername,
    contribution: parseFloat(String(o.testingContribution ?? "0")),
    paymentStatus: o.paymentStatus,
    hasVoted: voteOrderIds.has(o.id),
    vote: voteRows.find(v => v.orderId === o.id) ?? null,
  }));

  const typedVoteRows = voteRows as { peptideName: string; vialCount: number; testSelections: string[] }[];
  const leading = getLeadingVote(typedVoteRows);
  const thresholds = computeThresholds(leading.peptideName, leading.vialCount);

  const configuredTestOptions = (round.testOptions && Array.isArray(round.testOptions) && round.testOptions.length > 0)
    ? round.testOptions as string[]
    : DEFAULT_TEST_OPTIONS;

  const testOrder = leading.testOrder.length > 0
    ? leading.testOrder.filter(t => configuredTestOptions.includes(t))
    : configuredTestOptions;

  const milestones = computeMilestones(leading.peptideName, leading.vialCount, testOrder);

  const adminPeptideOptions = (round.voteOptions && Array.isArray(round.voteOptions) && round.voteOptions.length > 0)
    ? round.voteOptions as string[]
    : PEPTIDE_NAMES;

  // Fetch the GB's linked product names so any compound in the GB always appears in the ballot,
  // even if it isn't in the hardcoded PEPTIDE_NAMES / Janoshik price list.
  const gbProductRows = await db
    .select({ name: productsTable.name })
    .from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(and(eq(groupBuyProductsTable.groupBuyId, gbId), eq(groupBuyProductsTable.active, true)));
  const gbProductNames = gbProductRows.map(p => p.name).filter(Boolean);
  const allPeptideOptions = [...new Set([...PEPTIDE_NAMES, ...gbProductNames])].sort();

  // Sales by product — sum line item qty across all orders in this GB, sorted most → least sold
  const gbOrderIds = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, gbId), sql`${ordersTable.deletedAt} IS NULL`));
  const gbOrderIdList = gbOrderIds.map(o => o.id);

  let gbProductsSortedBySales: { name: string; qtySold: number }[] = [];
  if (gbOrderIdList.length > 0) {
    const salesRows = await db
      .select({
        productName: orderLineItemsTable.productName,
        qtySold: sum(orderLineItemsTable.quantity),
      })
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, gbOrderIdList))
      .groupBy(orderLineItemsTable.productName);
    gbProductsSortedBySales = salesRows
      .map(r => ({ name: r.productName, qtySold: parseFloat(r.qtySold as string) || 0 }))
      .sort((a, b) => b.qtySold - a.qtySold);
  } else {
    // No orders yet — fall back to GB product list (unsorted)
    gbProductsSortedBySales = gbProductNames.map(name => ({ name, qtySold: 0 }));
  }

  res.json({
    round: {
      ...round,
      contributionAmount: parseFloat(round.contributionAmount as string),
      anyContribution: round.anyContribution ?? false,
      lateOptInEnabled: round.lateOptInEnabled ?? false,
      voteOptions: round.voteOptions ?? null,
      peptideBatches: ((round as any).peptideBatches as Record<string, string> | null) ?? {},
      testOptions: round.testOptions ?? null,
      labShippingCost: (round as any).labShippingCost ? parseFloat((round as any).labShippingCost as string) : null,
    },
    poolTotal: parseFloat((poolRow?.total as string) ?? "0") || 0,
    contributorCount: poolRow?.contributors ?? 0,
    votes: voteRows,
    contributors,
    milestones,
    thresholds: {
      ...thresholds,
      leadingPeptide: leading.peptideName,
      leadingVials: leading.vialCount,
      testOrder,
    },
    peptideOptions: adminPeptideOptions,
    allPeptideOptions,
    gbProductsSortedBySales,
    testOptions: configuredTestOptions,
    allTestOptions: ALL_TEST_OPTION_NAMES,
  });
});

// ── Admin: POST /api/admin/group-buys/:gbId/testing ───────────
router.post("/admin/group-buys/:gbId/testing", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;
  const { contributionAmount = 15, anyContribution = false } = req.body;

  const [existing] = await db
    .select({ id: gbTestingRoundsTable.id, status: gbTestingRoundsTable.status })
    .from(gbTestingRoundsTable)
    .where(
      and(
        eq(gbTestingRoundsTable.groupBuyId, gbId),
        sql`${gbTestingRoundsTable.status} != 'results_received'`
      )
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "A testing round is already active for this group buy" });
    return;
  }

  const isAny = Boolean(anyContribution);
  let amountDecimal = "0.00";
  if (!isAny) {
    const parsed = parseFloat(String(contributionAmount));
    if (isNaN(parsed) || parsed <= 0) {
      res.status(400).json({ error: "contributionAmount must be a positive number" });
      return;
    }
    amountDecimal = parsed.toFixed(2);
  }

  const [round] = await db
    .insert(gbTestingRoundsTable)
    .values({ id: nanoid(), groupBuyId: gbId, contributionAmount: amountDecimal, anyContribution: isAny })
    .returning();

  await db.update(groupBuysTable).set({ testingEnabled: true }).where(eq(groupBuysTable.id, gbId));

  res.status(201).json({ round });
});

// ── Admin: POST /api/admin/group-buys/:gbId/testing/extract-batches ──
router.post(
  "/admin/group-buys/:gbId/testing/extract-batches",
  imageUpload.array("images", 30),
  async (req, res): Promise<void> => {
    if (!requireAdmin(req, res)) return;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ error: "No images uploaded" });
      return;
    }
    try {
      const batchNumbers = await extractBatchNumbersFromImages(
        files.map(f => ({ data: f.buffer, mimeType: f.mimetype }))
      );
      res.json({ batchNumbers });
    } catch {
      res.status(500).json({ error: "OCR extraction failed" });
    }
  }
);

// ── Admin: PATCH /api/admin/group-buys/:gbId/testing ─────────
router.patch("/admin/group-buys/:gbId/testing", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;
  const { status, resultNotes, resultPdfUrl, voteOptions, peptideBatches, testOptions, janoshikPaymentUrl, anyContribution, lateOptInEnabled, labShippingCost } = req.body;

  const [round] = await db
    .select()
    .from(gbTestingRoundsTable)
    .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
    .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
    .limit(1);

  if (!round) {
    res.status(404).json({ error: "No testing round found" });
    return;
  }

  const updates: Partial<typeof gbTestingRoundsTable.$inferInsert> & Record<string, any> = {};

  if (status && ["active", "closed", "sent_to_lab", "results_received"].includes(status)) {
    updates.status = status;
  }
  if (resultNotes !== undefined) updates.resultNotes = resultNotes || null;
  if (resultPdfUrl !== undefined) updates.resultPdfUrl = resultPdfUrl || null;
  if (status === "results_received" && !round.resultPostedAt) {
    updates.resultPostedAt = new Date();
  }
  if (voteOptions !== undefined) {
    if (voteOptions === null || (Array.isArray(voteOptions) && voteOptions.length === 0)) {
      updates.voteOptions = null;
    } else if (Array.isArray(voteOptions)) {
      updates.voteOptions = voteOptions.map(String).filter(Boolean);
    }
  }
  if (testOptions !== undefined) {
    if (testOptions === null || (Array.isArray(testOptions) && testOptions.length === 0)) {
      updates.testOptions = null;
    } else if (Array.isArray(testOptions)) {
      updates.testOptions = testOptions.map(String).filter(t => ALL_TEST_OPTION_NAMES.includes(t));
    }
  }
  if (janoshikPaymentUrl !== undefined) {
    updates.janoshikPaymentUrl = janoshikPaymentUrl ? String(janoshikPaymentUrl).trim() || null : null;
  }
  if (anyContribution !== undefined) {
    updates.anyContribution = Boolean(anyContribution);
  }
  if (lateOptInEnabled !== undefined) {
    updates.lateOptInEnabled = Boolean(lateOptInEnabled);
  }
  if (peptideBatches !== undefined) {
    if (peptideBatches === null) {
      updates.peptideBatches = null;
    } else if (typeof peptideBatches === "object" && !Array.isArray(peptideBatches)) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(peptideBatches)) {
        if (typeof v === "string" && v.trim()) cleaned[k] = v.trim();
      }
      updates.peptideBatches = Object.keys(cleaned).length > 0 ? cleaned : null;
    }
  }
  if (labShippingCost !== undefined) {
    if (labShippingCost === null || labShippingCost === "" || labShippingCost === 0) {
      updates.labShippingCost = null;
    } else {
      const parsed = parseFloat(String(labShippingCost));
      if (!isNaN(parsed) && parsed > 0) updates.labShippingCost = String(parsed);
    }
  }

  const [updated] = await db
    .update(gbTestingRoundsTable)
    .set(updates)
    .where(eq(gbTestingRoundsTable.id, round.id))
    .returning();

  res.json({ round: updated });
});

// ── GET /api/account/testing/active-pools — GBs where the signed-in member is already opted in ──
router.get("/account/testing/active-pools", async (req, res): Promise<void> => {
  loadOptionalAccount(req);
  if (!req.account) { res.status(401).json({ error: "Sign in required" }); return; }

  const tg = req.account.telegramUsername;
  const tgBare = tg.startsWith("@") ? tg.slice(1) : tg;
  const tgAt  = tg.startsWith("@") ? tg : `@${tg}`;

  // All GB orders for this customer
  const customerOrders = await db
    .select({ groupBuyId: ordersTable.groupBuyId, testingContribution: ordersTable.testingContribution })
    .from(ordersTable)
    .where(
      and(
        sql`(lower(${ordersTable.telegramUsername}) = ${tgBare.toLowerCase()} OR lower(${ordersTable.telegramUsername}) = ${tgAt.toLowerCase()})`,
        sql`${ordersTable.groupBuyId} IS NOT NULL`,
        sql`${ordersTable.deletedAt} IS NULL`,
      )
    );

  const uniqueGbIds = [...new Set(customerOrders.map(o => o.groupBuyId).filter(Boolean))] as string[];
  if (uniqueGbIds.length === 0) { res.json([]); return; }

  const result: { gbId: string; gbName: string }[] = [];

  for (const gbId of uniqueGbIds) {
    const [round] = await db
      .select({
        status: gbTestingRoundsTable.status,
        anyContribution: gbTestingRoundsTable.anyContribution,
        janoshikPaymentUrl: gbTestingRoundsTable.janoshikPaymentUrl,
        contributionAmount: gbTestingRoundsTable.contributionAmount,
        createdAt: gbTestingRoundsTable.createdAt,
      })
      .from(gbTestingRoundsTable)
      .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
      .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
      .limit(1);

    if (!round) continue;

    const openMode = !!(round.anyContribution) || !!(round.janoshikPaymentUrl as string | null);

    // Check if opted in: open mode (any order qualifies) OR has testingContribution > 0
    const hasContribution = customerOrders.some(
      o => o.groupBuyId === gbId && parseFloat((o.testingContribution as string) ?? "0") > 0
    );

    if (!openMode && !hasContribution) continue;

    const [gb] = await db
      .select({ name: groupBuysTable.name })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));

    result.push({ gbId, gbName: gb?.name ?? gbId });
  }

  res.json(result);
});

// ── GET /api/account/testing/late-optin — GBs where the signed-in member can still late opt-in ──
router.get("/account/testing/late-optin", async (req, res): Promise<void> => {
  loadOptionalAccount(req);
  if (!req.account) { res.status(401).json({ error: "Sign in required" }); return; }

  const tg = req.account.telegramUsername;
  const tgBare = tg.startsWith("@") ? tg.slice(1) : tg;
  const tgAt  = tg.startsWith("@") ? tg : `@${tg}`;

  // Find orders for this customer that have no testing contribution and belong to a GB
  const customerOrders = await db
    .select({ groupBuyId: ordersTable.groupBuyId })
    .from(ordersTable)
    .where(
      and(
        sql`(lower(${ordersTable.telegramUsername}) = ${tgBare.toLowerCase()} OR lower(${ordersTable.telegramUsername}) = ${tgAt.toLowerCase()})`,
        sql`(${ordersTable.testingContribution} IS NULL OR ${ordersTable.testingContribution} = '0')`,
        sql`${ordersTable.groupBuyId} IS NOT NULL`,
        sql`${ordersTable.deletedAt} IS NULL`,
      )
    );

  const uniqueGbIds = [...new Set(customerOrders.map(o => o.groupBuyId).filter(Boolean))] as string[];
  if (uniqueGbIds.length === 0) { res.json([]); return; }

  // For each GB, check if there's an active round with lateOptInEnabled
  const availableGbs: { gbId: string; gbName: string; contributionAmount: number; anyContribution: boolean }[] = [];

  for (const gbId of uniqueGbIds) {
    const [round] = await db
      .select({
        status: gbTestingRoundsTable.status,
        lateOptInEnabled: gbTestingRoundsTable.lateOptInEnabled,
        contributionAmount: gbTestingRoundsTable.contributionAmount,
        anyContribution: gbTestingRoundsTable.anyContribution,
      })
      .from(gbTestingRoundsTable)
      .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
      .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
      .limit(1);

    if (!round || round.status !== "active" || !round.lateOptInEnabled) continue;

    const [gb] = await db
      .select({ name: groupBuysTable.name })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));

    availableGbs.push({
      gbId,
      gbName: gb?.name ?? gbId,
      contributionAmount: parseFloat(round.contributionAmount as string),
      anyContribution: !!(round.anyContribution),
    });
  }

  res.json(availableGbs);
});

// ── GET /api/account/testing/gb-pools — all GBs the member is part of that have a testing round ──
router.get("/account/testing/gb-pools", async (req, res): Promise<void> => {
  loadOptionalAccount(req);
  if (!req.account) { res.status(401).json({ error: "Sign in required" }); return; }

  const tg = req.account.telegramUsername;
  const tgBare = tg.startsWith("@") ? tg.slice(1) : tg;
  const tgAt  = tg.startsWith("@") ? tg : `@${tg}`;

  const customerOrders = await db
    .select({ groupBuyId: ordersTable.groupBuyId, testingContribution: ordersTable.testingContribution })
    .from(ordersTable)
    .where(and(
      sql`(lower(${ordersTable.telegramUsername}) = ${tgBare.toLowerCase()} OR lower(${ordersTable.telegramUsername}) = ${tgAt.toLowerCase()})`,
      sql`${ordersTable.groupBuyId} IS NOT NULL`,
      sql`${ordersTable.deletedAt} IS NULL`,
    ));

  const uniqueGbIds = [...new Set(customerOrders.map(o => o.groupBuyId).filter(Boolean))] as string[];
  if (uniqueGbIds.length === 0) { res.json([]); return; }

  const result: {
    gbId: string; gbName: string;
    isOptedIn: boolean; canLateOptIn: boolean;
    contributionAmount: number; anyContribution: boolean;
    roundStatus: string;
  }[] = [];

  for (const gbId of uniqueGbIds) {
    const [round] = await db
      .select({
        status: gbTestingRoundsTable.status,
        anyContribution: gbTestingRoundsTable.anyContribution,
        janoshikPaymentUrl: gbTestingRoundsTable.janoshikPaymentUrl,
        contributionAmount: gbTestingRoundsTable.contributionAmount,
        lateOptInEnabled: gbTestingRoundsTable.lateOptInEnabled,
      })
      .from(gbTestingRoundsTable)
      .where(eq(gbTestingRoundsTable.groupBuyId, gbId))
      .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
      .limit(1);

    if (!round) continue;

    const openMode = !!(round.anyContribution) || !!(round.janoshikPaymentUrl as string | null);
    const hasContribution = customerOrders.some(
      o => o.groupBuyId === gbId && parseFloat((o.testingContribution as string) ?? "0") > 0
    );
    const isOptedIn = openMode || hasContribution;
    const canLateOptIn = !isOptedIn && round.status === "active" && !!(round.lateOptInEnabled);

    const [gb] = await db
      .select({ name: groupBuysTable.name })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));

    result.push({
      gbId,
      gbName: gb?.name ?? gbId,
      isOptedIn,
      canLateOptIn,
      contributionAmount: parseFloat(round.contributionAmount as string) || 0,
      anyContribution: !!(round.anyContribution),
      roundStatus: round.status,
    });
  }

  res.json(result);
});

// ── GET /api/testing/results — public: all completed GB tests ─
router.get("/testing/results", async (_req, res): Promise<void> => {
  const results = await db
    .select({
      roundId: gbTestingRoundsTable.id,
      gbId: gbTestingRoundsTable.groupBuyId,
      gbName: groupBuysTable.name,
      resultNotes: gbTestingRoundsTable.resultNotes,
      resultPdfUrl: gbTestingRoundsTable.resultPdfUrl,
      resultPostedAt: gbTestingRoundsTable.resultPostedAt,
      status: gbTestingRoundsTable.status,
    })
    .from(gbTestingRoundsTable)
    .leftJoin(groupBuysTable, eq(gbTestingRoundsTable.groupBuyId, groupBuysTable.id))
    .where(eq(gbTestingRoundsTable.status, "results_received"))
    .orderBy(sql`${gbTestingRoundsTable.resultPostedAt} DESC`);

  res.json(results);
});

export default router;
