import React, { useEffect, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Loader2, AlertCircle, TestTube, RefreshCw,
  Lock, Unlock, CheckCircle2, Clock, XCircle, ChevronDown,
  ExternalLink, Users, BarChart3,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import { HubBottomNav, HubSection } from "@/components/HubBottomNav";

// ── types ─────────────────────────────────────────────────────────────────────

interface Milestone {
  label: string;
  amount: number;
  type: "test" | "vial";
  vialNum?: number;
}

interface TestingRound {
  id: string;
  status: string;
  contributionAmount: number;
  anyContribution: boolean;
  lateOptInEnabled: boolean;
  resultNotes: string | null;
  resultPdfUrl: string | null;
  resultPostedAt: string | null;
  testOptions: string[];
  janoshikPaymentUrl: string | null;
  labShippingCost: number | null;
  voteOptions: string[] | null;
}

interface VoteSummary {
  peptideName: string;
  totalVotes: number;
  vials: Record<string, number>;
}

interface PendingContribution {
  id: string;
  amount: number;
  paymentMethod: string;
  txHash: string | null;
  status: string;
  rejectionReason: string | null;
}

interface PaymentMethods {
  cryptoWalletAddress: string | null;
  cryptoCurrency: string;
  cryptoNetwork: string;
  revolutHandle: string | null;
  paypalHandle: string | null;
  anonPayEnabled: boolean;
  janoshikPaymentUrl: string | null;
}

interface TestingData {
  round: TestingRound | null;
  poolTotal: number;
  contributorCount: number;
  totalVotes: number;
  isOptedIn: boolean;
  hasGbOrder: boolean;
  hasVoted: boolean;
  existingVote: { peptideName: string; vialCount: number; testSelections: string[] } | null;
  milestones: Milestone[];
  thresholds: { tier1: number; tier2: number | null; leadingPeptide: string; leadingVials: number; testOrder: string[] };
  votes: VoteSummary[];
  testVotes: Record<string, number>;
  vialVotes: Record<string, number>;
  pendingContribution: PendingContribution | null;
  paymentMethods: PaymentMethods;
  peptideOptions: string[];
  endotoxinPrice: number;
  vialPrice: number;
  maxVials: number;
}

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: "Collecting",
  closed: "Pool Closed",
  sent_to_lab: "Sent to Lab",
  results_received: "Results In",
};

const MILESTONE_COLORS = ["#3B82F6", "#8B5CF6", "#E9A020", "#10B981"];

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pctBar(poolTotal: number, milestones: Milestone[]) {
  if (!milestones.length) return 0;
  const total = milestones[milestones.length - 1].amount;
  return Math.min(100, total > 0 ? (poolTotal / total) * 100 : 0);
}

// ── layout wrapper ─────────────────────────────────────────────────────────────

function GbPoolLayout({ title, children }: { title?: string; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <PageLayout title={title}>
      {children}
      <HubBottomNav
        section={"lab-pool" as HubSection}
        setSection={(s: HubSection) => setLocation(`/account?s=${s}`)}
        hubMoreOpen={false}
        setHubMoreOpen={() => {}}
      />
    </PageLayout>
  );
}

// ── milestone bar ─────────────────────────────────────────────────────────────

function MilestonesSection({ milestones, poolTotal }: { milestones: Milestone[]; poolTotal: number }) {
  if (!milestones.length) return null;
  const topAmount = milestones[milestones.length - 1].amount;
  const pct = Math.min(100, topAmount > 0 ? (poolTotal / topAmount) * 100 : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
          Milestones
        </p>
        <span className="text-[11px] tabular-nums" style={{ color: "var(--t-muted)" }}>
          {fmtUsd(poolTotal)} / {fmtUsd(topAmount)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-border)" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 gap-2">
        {milestones.map((m, i) => {
          const hit = poolTotal >= m.amount;
          const color = MILESTONE_COLORS[i % MILESTONE_COLORS.length];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: hit ? "rgba(16,185,129,0.06)" : "var(--t-surface)",
                border: `1.5px solid ${hit ? "rgba(16,185,129,0.3)" : "var(--t-border)"}`,
              }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: hit ? "rgba(16,185,129,0.12)" : `${color}18` }}>
                {hit
                  ? <Unlock className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                  : <Lock className="w-3.5 h-3.5" style={{ color }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: hit ? "#10B981" : "var(--t-text)" }}>
                  {m.label}
                </p>
                <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                  {hit ? "Unlocked" : `Needs ${fmtUsd(m.amount)}`}
                </p>
              </div>
              <span className="text-[12px] font-bold tabular-nums shrink-0"
                style={{ color: hit ? "#10B981" : "var(--t-muted)", fontFamily: "ui-monospace, monospace" }}>
                {fmtUsd(m.amount)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── vote leaderboard ─────────────────────────────────────────────────────────

function VoteLeaderboard({ votes, totalVotes, testVotes }: { votes: VoteSummary[]; totalVotes: number; testVotes: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? votes : votes.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
          Compound Votes
        </p>
        {totalVotes > 0 && (
          <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
          </span>
        )}
      </div>

      {totalVotes === 0 ? (
        <div className="text-center py-5" style={{ color: "var(--t-muted)" }}>
          <BarChart3 className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No votes yet — be the first</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {shown.map((v, i) => {
              const pct = totalVotes > 0 ? (v.totalVotes / totalVotes) * 100 : 0;
              const isLeading = i === 0;
              return (
                <motion.div key={v.peptideName}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>
                      {isLeading && <span className="mr-1">🥇</span>}{v.peptideName}
                    </span>
                    <span className="text-[12px] tabular-nums shrink-0" style={{ color: "var(--t-muted)" }}>
                      {v.totalVotes} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-border)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: isLeading ? "#3B82F6" : "var(--t-muted)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {votes.length > 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[12px] transition-opacity hover:opacity-70"
              style={{ color: "var(--t-blue)" }}
            >
              {expanded ? "Show less" : `+${votes.length - 3} more`}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}

          {/* Test type tally */}
          {Object.keys(testVotes).length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: "var(--t-muted)" }}>
                Test Types Requested
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(testVotes)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, count]) => (
                    <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
                      {name}
                      <span style={{ color: "var(--t-muted)" }}>· {count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── vote form ──────────────────────────────────────────────────────────────────

function VoteForm({
  gbId, peptideOptions, testOptions, maxVials, onDone,
}: {
  gbId: string;
  peptideOptions: string[];
  testOptions: string[];
  maxVials: number;
  onDone: () => void;
}) {
  const [compound, setCompound] = useState("");
  const [vialCount, setVialCount] = useState(1);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (t: string) => {
    setSelectedTests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const submit = async () => {
    if (!compound) { setErr("Pick a compound"); return; }
    if (selectedTests.length === 0) { setErr("Pick at least one test type"); return; }
    setErr(null);
    setSubmitting(true);
    try {
      const r = await fetch(`/api/group-buys/${gbId}/testing/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ peptideName: compound, vialCount, testSelections: selectedTests }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to submit vote");
      onDone();
    } catch (e: unknown) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectCls = "w-full px-3 py-2.5 text-sm rounded-xl outline-none transition-colors appearance-none";
  const selectStyle = { border: "1.5px solid var(--t-border)", color: "var(--t-text)", background: "var(--t-surface)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-2xl p-4"
      style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)" }}
    >
      <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
        Cast Your Vote
      </p>

      {/* Compound */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Which compound?</label>
        <select value={compound} onChange={e => setCompound(e.target.value)} className={selectCls} style={selectStyle}>
          <option value="">— select compound —</option>
          {peptideOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Vials */}
      {maxVials > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Number of vials</label>
          <div className="flex gap-2">
            {Array.from({ length: maxVials }, (_, i) => i + 1).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setVialCount(v)}
                className="flex-1 py-2 text-sm font-semibold rounded-xl transition-colors"
                style={{
                  border: `1.5px solid ${vialCount === v ? "var(--t-blue)" : "var(--t-border)"}`,
                  background: vialCount === v ? "rgba(59,130,246,0.1)" : "var(--t-surface)",
                  color: vialCount === v ? "var(--t-blue)" : "var(--t-text)",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Test types */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Test types (select all you want)</label>
        <div className="flex flex-col gap-2">
          {testOptions.map(t => {
            const checked = selectedTests.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors"
                style={{
                  border: `1.5px solid ${checked ? "var(--t-blue)" : "var(--t-border)"}`,
                  background: checked ? "rgba(59,130,246,0.08)" : "var(--t-surface)",
                  color: "var(--t-text)",
                }}
              >
                <span className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
                  style={{ background: checked ? "var(--t-blue)" : "var(--t-border)" }}>
                  {checked && <span className="text-white text-[10px]">✓</span>}
                </span>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {err && <p className="text-[12px]" style={{ color: "#EF4444" }}>{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
        style={{ background: "var(--t-blue)", color: "white" }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Vote"}
      </button>
    </motion.div>
  );
}

// ── existing vote card ─────────────────────────────────────────────────────────

function ExistingVoteCard({ vote }: { vote: { peptideName: string; vialCount: number; testSelections: string[] } }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-4 space-y-2"
      style={{ background: "rgba(16,185,129,0.06)", border: "1.5px solid rgba(16,185,129,0.25)" }}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#10B981" }} />
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "#10B981" }}>
          Your Vote
        </p>
      </div>
      <p className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>{vote.peptideName}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px]"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
          {vote.vialCount} vial{vote.vialCount !== 1 ? "s" : ""}
        </span>
        {vote.testSelections.map(t => (
          <span key={t} className="inline-flex px-2 py-0.5 rounded-full text-[11px]"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ── pending contribution status ───────────────────────────────────────────────

function PendingContributionCard({ pc }: { pc: PendingContribution }) {
  const configs: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
    pending:  { label: "Payment Under Review", color: "#CA8A04", bg: "rgba(234,179,8,0.07)",   border: "rgba(234,179,8,0.3)",   Icon: Clock },
    verified: { label: "Contribution Confirmed", color: "#16A34A", bg: "rgba(74,222,128,0.07)", border: "rgba(74,222,128,0.3)", Icon: CheckCircle2 },
    rejected: { label: "Payment Rejected", color: "#DC2626", bg: "rgba(239,68,68,0.07)",      border: "rgba(239,68,68,0.3)",   Icon: XCircle },
  };
  const cfg = configs[pc.status] ?? configs.pending;
  const { Icon } = cfg;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-1.5"
      style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
        <p className="text-[12px] font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
      </div>
      <p className="text-[13px]" style={{ color: "var(--t-text)" }}>
        {fmtUsd(pc.amount)} via <span className="font-medium capitalize">{pc.paymentMethod}</span>
      </p>
      {pc.rejectionReason && (
        <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>{pc.rejectionReason}</p>
      )}
    </motion.div>
  );
}

// ── results card ──────────────────────────────────────────────────────────────

function ResultsCard({ round }: { round: TestingRound }) {
  if (!round.resultNotes && !round.resultPdfUrl) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "rgba(233,160,32,0.07)", border: "1.5px solid rgba(233,160,32,0.3)" }}
    >
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 shrink-0" style={{ color: "#E9A020" }} />
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "#E9A020" }}>
          Results
        </p>
      </div>
      {round.resultNotes && (
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text)" }}>{round.resultNotes}</p>
      )}
      {round.resultPdfUrl && (
        <a
          href={round.resultPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
          style={{ color: "#E9A020" }}
        >
          View Full Report
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </motion.div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function GbTestingPool() {
  const [, params] = useRoute("/testing/:gbId");
  const [, setLocation] = useLocation();
  const gbId = params?.gbId ?? "";
  const { isLoggedIn } = useAccount();

  const [data, setData] = useState<TestingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gbName, setGbName] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const adminSecret = (() => { try { return sessionStorage.getItem("_adm_s") ?? ""; } catch { return ""; } })();
      const headers: Record<string, string> = {};
      if (adminSecret) headers["x-admin-secret"] = adminSecret;
      const r = await fetch(`/api/group-buys/${gbId}/testing`, { headers, credentials: "include" });
      if (!r.ok) throw new Error("Failed to load testing data");
      setData(await r.json());
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [gbId]);

  useEffect(() => {
    if (!gbId) return;
    setLoading(true);
    setError(null);
    load();
    fetch(`/api/group-buys/${gbId}/info`).then(r => r.json()).then(d => {
      if (d?.name) setGbName(d.name);
    }).catch(() => {});
  }, [gbId, load, refreshKey]);

  // Loading
  if (loading) {
    return (
      <GbPoolLayout title="Testing Pool">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
        </div>
      </GbPoolLayout>
    );
  }

  // Error
  if (error) {
    return (
      <GbPoolLayout title="Testing Pool">
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#EF4444" }} />
          <p style={{ color: "var(--t-text)" }}>{error}</p>
        </div>
      </GbPoolLayout>
    );
  }

  // No round
  if (!data?.round) {
    return (
      <GbPoolLayout title="Testing Pool">
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <TestTube className="w-12 h-12 mx-auto mb-4 opacity-25" style={{ color: "var(--t-muted)" }} />
          <p className="font-bold text-lg mb-2" style={{ color: "var(--t-text)" }}>No Testing Round Yet</p>
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>
            No lab testing pool has been set up for this group buy yet.
          </p>
        </div>
      </GbPoolLayout>
    );
  }

  const {
    round, poolTotal, contributorCount, totalVotes, votes, testVotes,
    milestones, isOptedIn, hasGbOrder, hasVoted, existingVote,
    pendingContribution, peptideOptions,
  } = data;

  const isResults = round.status === "results_received";
  const isClosed = round.status === "closed" || round.status === "sent_to_lab";

  return (
    <GbPoolLayout title={`${gbName ? gbName + " · " : ""}Testing Pool`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4"
      >
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden"
          style={{ borderRadius: 16, background: "linear-gradient(135deg, var(--t-blue-deep, #1B3A7A) 0%, #1e3a8a 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 90% 25%, rgba(255,255,255,0.1) 0%, transparent 55%)" }} />
          <div className="relative px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.45)" }} />
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Lab Testing Pool
                  </span>
                  <span className="w-px h-3 shrink-0" style={{ background: "rgba(255,255,255,0.2)" }} />
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Round 01
                  </span>
                </div>
                <h1 className="text-[22px] font-extrabold text-white leading-tight truncate">
                  {gbName || "Group Buy"}
                </h1>
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1"
                    style={{ borderRadius: 6, background: "rgba(255,255,255,0.14)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                    {round.status === "active" && (
                      <motion.span className="w-1.5 h-1.5 inline-block shrink-0"
                        style={{ background: "#4ADE80", borderRadius: "50%" }}
                        animate={{ opacity: [1, 0.25, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
                    )}
                    {STATUS_LABELS[round.status] ?? round.status}
                  </span>
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <Users className="w-3 h-3 inline mr-0.5 mb-0.5" />
                    {contributorCount} contributor{contributorCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[13px] font-black tabular-nums" style={{ color: "white", fontFamily: "ui-monospace, monospace" }}>
                    {fmtUsd(poolTotal)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="w-9 h-9 flex items-center justify-center shrink-0 transition-opacity hover:opacity-70 mt-0.5"
                style={{ borderRadius: 8, background: "rgba(255,255,255,0.12)" }}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Results (if available) */}
        {isResults && <ResultsCard round={round} />}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="rounded-2xl p-4 space-y-4"
            style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)" }}>
            <MilestonesSection milestones={milestones} poolTotal={poolTotal} />
          </div>
        )}

        {/* Vote leaderboard */}
        <div className="rounded-2xl p-4"
          style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)" }}>
          <VoteLeaderboard votes={votes} totalVotes={totalVotes} testVotes={testVotes} />
        </div>

        {/* Pending contribution (late opt-in payment awaiting review) */}
        {pendingContribution && <PendingContributionCard pc={pendingContribution} />}

        {/* Opted-in section: existing vote or vote form */}
        {isOptedIn && !isClosed && !isResults && (
          hasVoted && existingVote
            ? <ExistingVoteCard vote={existingVote} />
            : (
              <VoteForm
                gbId={gbId}
                peptideOptions={peptideOptions}
                testOptions={round.testOptions}
                maxVials={data.maxVials}
                onDone={() => { setLoading(true); load(); }}
              />
            )
        )}

        {/* Opted-in + closed: show existing vote if any */}
        {isOptedIn && (isClosed || isResults) && hasVoted && existingVote && (
          <ExistingVoteCard vote={existingVote} />
        )}

        {/* Not opted in but has a GB order — show late opt-in CTA */}
        {!isOptedIn && hasGbOrder && round.lateOptInEnabled && !pendingContribution && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 space-y-3 text-center"
            style={{ background: "rgba(59,130,246,0.05)", border: "1.5px solid rgba(59,130,246,0.2)" }}
          >
            <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
              You have a GB order — join the testing pool
            </p>
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
              Contribute {round.anyContribution ? "any amount" : fmtUsd(round.contributionAmount)} to unlock voting.
              {round.janoshikPaymentUrl && " Use the Janoshik payment link below."}
            </p>
            {round.janoshikPaymentUrl && (
              <a
                href={round.janoshikPaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-bold px-4 py-2.5 rounded-xl"
                style={{ background: "var(--t-blue)", color: "white" }}
              >
                Pay via Janoshik
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </motion.div>
        )}

        {/* Not opted in, no GB order */}
        {!isOptedIn && !hasGbOrder && !isLoggedIn && (
          <div className="text-center py-4" style={{ color: "var(--t-muted)" }}>
            <p className="text-[13px]">
              Sign in to your account to participate in this testing pool.
            </p>
          </div>
        )}
      </motion.div>
    </GbPoolLayout>
  );
}
