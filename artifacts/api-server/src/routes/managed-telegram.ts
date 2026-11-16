import { Router, type Request, type Response } from "express";
import { db, accountsTable, groupBuysTable, accountGroupBuysTable, ordersTable, gbReshippersTable, wholesaleSharesTable, wholesaleShareMembersTable } from "@workspace/db";
import { and, eq, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { requireOrganiser } from "../middleware/require-organiser";
import { requireReshipper } from "../middleware/require-reshipper";
import { requireWholesale } from "../middleware/require-wholesale";
import { getLinkedTelegramUsername } from "../lib/telegram";
import { reshipperOwnedWhere } from "../lib/reshipper-order-claims";

const router = Router();
type Scope = "organiser" | "reshipper" | "shared";
const identity = (column: SQLWrapper) => sql`lower(ltrim(btrim(${column}), '@'))`;
const key = (value: string) => value.trim().replace(/^@/, "").toLowerCase();

/** Scope checks run before every lookup and again after the external request. */
function managedAccount(scope: Scope, req: Request) {
  const id = String(req.params.id);
  const username = key(String(req.params.username));
  const actor = scope === "organiser" ? req.organiser!.telegramUsername
    : scope === "reshipper" ? req.reshipper!.telegramUsername : req.account!.telegramUsername;
  let allowed: SQL;
  if (scope === "organiser") {
    const owner = req.organiser?.isAdmin
      ? sql`${req.organiser.adminGbId === id}`
      : eq(groupBuysTable.organiserId, actor);
    allowed = sql`EXISTS (
      SELECT 1 FROM ${groupBuysTable} WHERE ${groupBuysTable.id} = ${id}
      AND ${owner}
      AND (EXISTS (SELECT 1 FROM ${accountGroupBuysTable}
        WHERE ${accountGroupBuysTable.groupBuyId} = ${id}
        AND ${accountGroupBuysTable.accountId} = ${accountsTable.telegramUsername})
      OR EXISTS (SELECT 1 FROM ${ordersTable} WHERE ${ordersTable.groupBuyId} = ${id}
        AND ${identity(ordersTable.telegramUsername)} = ${identity(accountsTable.telegramUsername)}
        AND ${ordersTable.deletedAt} IS NULL)))`;
  } else if (scope === "reshipper") {
    allowed = sql`EXISTS (SELECT 1 FROM ${gbReshippersTable}
      WHERE ${gbReshippersTable.gbId} = ${id} AND ${gbReshippersTable.reshipperUsername} = ${actor}
      AND ${gbReshippersTable.enabled} IS NOT FALSE)
      AND EXISTS (SELECT 1 FROM ${ordersTable} WHERE ${reshipperOwnedWhere(id, actor)}
        AND ${identity(ordersTable.telegramUsername)} = ${identity(accountsTable.telegramUsername)})`;
  } else {
    allowed = sql`EXISTS (SELECT 1 FROM ${wholesaleSharesTable}
      INNER JOIN ${wholesaleShareMembersTable} ON ${wholesaleShareMembersTable.shareId} = ${wholesaleSharesTable.id}
      WHERE ${wholesaleSharesTable.id} = ${id}
      AND ${identity(wholesaleSharesTable.creatorUsername)} = ${key(actor)}
      AND ${identity(wholesaleShareMembersTable.username)} = ${identity(accountsTable.telegramUsername)})`;
  }
  return db.select({ chatId: accountsTable.telegramChatId }).from(accountsTable)
    .where(and(eq(identity(accountsTable.telegramUsername), username), allowed)).limit(1);
}

function contact(scope: Scope) {
  return async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const [account] = await managedAccount(scope, req);
      if (!account) { res.status(404).json({ error: "Member contact is not available in this workspace." }); return; }
      if (!account.chatId) { res.json({ linked: false, username: null }); return; }
      const username = await getLinkedTelegramUsername(account.chatId);
      const [current] = await managedAccount(scope, req);
      if (!current || current.chatId !== account.chatId) {
        res.status(409).json({ error: "Member access or Telegram link changed. Please refresh." }); return;
      }
      res.json({ linked: true, username });
    } catch {
      res.status(502).json({ error: "Unable to retrieve the linked Telegram username. Please try again." });
    }
  };
}

router.get("/organiser/group-buys/:id/members/:username/telegram-profile", requireOrganiser, contact("organiser"));
router.get("/reshipper/gb/:id/members/:username/telegram-profile", requireReshipper, contact("reshipper"));
router.get("/wholesale-shares/:id/members/:username/telegram-profile", requireWholesale, contact("shared"));
export default router;
