import { Router, type IRouter } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, groupBuysTable, ordersTable } from "@workspace/db";
import { requireOrganiser } from "../middleware/require-organiser";
import { lookupTransactionDetails } from "../lib/transaction-details";

const router: IRouter = Router();
// Read-only, order-scoped evidence. Not a general RPC proxy or a payment verifier.
router.get("/organiser/group-buys/:gbId/orders/:orderId/transaction-details", requireOrganiser, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const gbId = String(req.params.gbId), orderId = String(req.params.orderId);
  const txid = typeof req.query.txid === "string" ? req.query.txid.trim() : "";
  const network = /^0x[0-9a-f]{64}$/i.test(txid) ? "Ethereum"
    : /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(txid) ? "Solana" : null;
  if (!network) { res.status(400).json({ error: "Provide an Ethereum or Solana transaction ID." }); return; }
  const actor = req.organiser!;
  if (actor.isAdmin && actor.adminGbId !== gbId) {
    res.status(403).json({ error: "This Admin session is scoped to a different group buy." }); return;
  }
  try {
    const [group] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(
      actor.isAdmin ? eq(groupBuysTable.id, gbId) : and(eq(groupBuysTable.id, gbId), eq(groupBuysTable.organiserId, actor.telegramUsername)));
    if (!group) { res.status(404).json({ error: "Group buy not found." }); return; }
    const [order] = await db.select({
      paymentTxHash: ordersTable.paymentTxHash, paymentTxHashes: ordersTable.paymentTxHashes,
      testPaymentTxHash: ordersTable.testPaymentTxHash, balanceTxHash: ordersTable.balanceTxHash,
      paymentCryptoNetwork: ordersTable.paymentCryptoNetwork, balanceCryptoQuote: ordersTable.balanceCryptoQuote,
    }).from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));
    if (!order) { res.status(404).json({ error: "Order not found." }); return; }
    const key = (value: string) => network === "Ethereum" ? value.trim().toLowerCase() : value.trim();
    const recorded = [order.paymentTxHash, ...(Array.isArray(order.paymentTxHashes) ? order.paymentTxHashes : []),
      order.testPaymentTxHash, order.balanceTxHash].some(value => typeof value === "string" && key(value) === key(txid));
    if (!recorded) { res.status(404).json({ error: "Transaction not recorded on this order." }); return; }
    const primary = [order.paymentTxHash, ...(order.paymentTxHashes ?? []), order.testPaymentTxHash]
      .some(value => typeof value === "string" && key(value) === key(txid));
    const quote = order.balanceCryptoQuote && typeof order.balanceCryptoQuote === "object"
      ? order.balanceCryptoQuote as Record<string, unknown> : null;
    const hint = primary ? order.paymentCryptoNetwork : quote?.network;
    if (hint) {
      const normalized = String(hint).toLowerCase().replace(/[\s_-]/g, "");
      const supported = network === "Ethereum"
        ? ["eth", "ethereum", "erc20", "ethereummainnet", "eth(erc20)", "ethereum(erc20)"]
        : ["sol", "solana", "spl", "solanamainnet", "solana(spl)"];
      if (!supported.includes(normalized)) {
        res.status(400).json({ error: "This payment's recorded network is not supported by the Ethereum/Solana lookup." }); return;
      }
    }
    res.json(await lookupTransactionDetails(network, txid));
  } catch (error) {
    console.error("[organiser-transaction-details]", error instanceof Error ? error.name : "Lookup failed");
    res.status(503).json({ error: "Transaction details are temporarily unavailable. Please retry." });
  }
});
export default router;
