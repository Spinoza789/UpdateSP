import React, { useEffect, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, CheckCircle2, Trophy, TestTube,
  ChevronDown, ExternalLink, Loader2, AlertCircle,
  RefreshCw, Lock, Unlock, LogIn, CheckSquare, Square,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import { HubBottomNav, HubSection } from "@/components/HubBottomNav";

// ── types ─────────────────────────────────────────────────────────────────────

interface VoteSummary {
  peptideName: string;
  totalVotes: number;
  vials: Record<number, number>;
}

interface Milestone {
  label: string;
  amount: number;
  type: "test" | "vial";
  vialNum?: number;
}

interface TestingData {
  round: {
    id: string;
    status: string;
    contributionAmount: number;
    anyContribution: boolean;
    resultNotes: string | null;
    resultPdfUrl: string | null;
    resultPostedAt: string | null;
    testOptions: string[];
    janoshikPaymentUrl: string | null;
  } | null;
  peptideBatches: Record<string, string>;
  poolTotal: number;
  contributorCount: number;
  votes: VoteSummary[];
  totalVotes: number;
  milestones: Milestone[];
  thresholds: {
    tier1: number;
    tier2: number | null;
    peptidePrice: number | null;
    leadingPeptide: string | null;
    leadingVials: number;
    testOrder: string[];
  } | null;
  hasVoted: boolean;
  existingVote: { peptideName: string; vialCount: number; testSelections: string[] } | null;
  isOptedIn: boolean;
  hasGbOrder: boolean;
  peptideOptions: string[];
  testOptions: string[];
  testVotes: Record<string, number>;
  vialVotes: Record<string, number>;
  endotoxinPrice: number;
  vialPrice: number;
  maxVials: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Collecting",
  closed: "Pool Closed",
  sent_to_lab: "Sent to Lab",
  results_received: "Results In",
};

const STATUS_COLORS: Record<string, string> = {
  active: "var(--t-blue)",
  closed: "#F59E0B",
  sent_to_lab: "#8B5CF6",
  results_received: "#10B981",
};

const HIT_COLOR = "#10B981";

// Ring colours cycle for up to ~6 milestones
const RING_COLORS = [
  "var(--t-blue)",   // test 1
  "#8B5CF6",         // test 2
  "#F59E0B",         // test 3 / vial 1
  "#EC4899",         // vial 2
  "#EF4444",         // vial 3
  "#06B6D4",         // overflow
];

// ── progressive pool gauge ────────────────────────────────────────────────────

interface GaugeProps {
  poolTotal: number;
  milestones: Milestone[];
  contributorCount: number;
}

function PoolGauge({ poolTotal, milestones, contributorCount }: GaugeProps) {
  const SIZE = 300;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const START = 135;
  const END = 405;
  const TOTAL = END - START;

  // Radii for concentric rings, outermost first
  const BASE_R = 118;
  const STEP = 22;
  const sw = 14;

  const maxAmount = milestones.length > 0 ? milestones[milestones.length - 1].amount : 200;

  return (
    <div className="flex flex-col items-center w-full">
      <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible", maxWidth: SIZE }}>
        <defs>
          {milestones.map((_, i) => (
            <filter key={i} id={`gs${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4"
                floodColor={RING_COLORS[i % RING_COLORS.length]}
                floodOpacity="0.45" />
            </filter>
          ))}
          <filter id="gsGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={HIT_COLOR} floodOpacity="0.45" />
          </filter>
        </defs>

        {milestones.map((ms, i) => {
          const r = BASE_R - i * STEP;
          if (r < 20) return null;

          const prevAmount = i === 0 ? 0 : milestones[i - 1].amount;
          const hit = poolTotal >= ms.amount;

          // Progress within this ring's band
          let frac = 0;
          if (poolTotal > prevAmount) {
            frac = Math.min(1, (poolTotal - prevAmount) / (ms.amount - prevAmount));
          }

          const baseColor = RING_COLORS[i % RING_COLORS.length];
          const color = hit ? HIT_COLOR : baseColor;
          const endAngle = START + frac * TOTAL;
          const tip = frac > 0 ? polarToXY(cx, cy, r, endAngle) : null;

          return (
            <g key={i}>
              {/* Track */}
              <path
                d={describeArc(cx, cy, r, START, END)}
                fill="none"
                stroke="var(--t-border)"
                strokeWidth={sw}
                strokeLinecap="round"
              />
              {/* Fill */}
              {frac > 0 && (
                <motion.path
                  d={describeArc(cx, cy, r, START, endAngle)}
                  fill="none"
                  stroke={color}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  filter={hit ? "url(#gsGreen)" : `url(#gs${i})`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2 - i * 0.1, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                />
              )}
              {/* Tip dot */}
              {tip && (
                <motion.circle
                  cx={tip.x} cy={tip.y} r={6}
                  fill={color}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300, damping: 18 }}
                />
              )}
            </g>
          );
        })}

        {/* Center text */}
        <text x={cx} y={cy - 36} textAnchor="middle" fill="var(--t-muted)"
          fontSize={9} fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, monospace" letterSpacing="0.16em">
          POOL TOTAL
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--t-text)"
          fontSize={38} fontWeight="800" fontFamily="ui-monospace, SFMono-Regular, monospace" letterSpacing="-0.02em">
          {formatMoney(poolTotal)}
        </text>
        <text x={cx} y={cy + 34} textAnchor="middle" fill="var(--t-subtle)"
          fontSize={10} fontFamily="ui-monospace, SFMono-Regular, monospace" letterSpacing="0.06em">
          {contributorCount} CONTRIBUTOR{contributorCount !== 1 ? "S" : ""}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-2">
        {milestones.map((ms, i) => {
          const hit = poolTotal >= ms.amount;
          const color = hit ? HIT_COLOR : RING_COLORS[i % RING_COLORS.length];
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div style={{ width: 10, height: 3, borderRadius: 9, background: color }} />
              <span style={{ color: "var(--t-muted)", fontSize: 10 }}>
                {ms.label} · {formatMoney(ms.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── milestone step cards ──────────────────────────────────────────────────────

function MilestoneCard({ ms, index, poolTotal }: { ms: Milestone; index: number; poolTotal: number }) {
  const hit = poolTotal >= ms.amount;
  const accentColor = hit ? HIT_COLOR : RING_COLORS[index % RING_COLORS.length];
  const stepNum = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 280, damping: 24 }}
      className="flex-1 min-w-0 relative overflow-hidden"
      style={{
        borderRadius: 8,
        border: `1.5px solid ${hit ? HIT_COLOR : "var(--t-border)"}`,
        background: hit ? "rgba(16,185,129,0.05)" : "var(--t-surface2)",
        padding: "14px 16px",
      }}
    >
      <div
        className="absolute -bottom-2 -right-1 select-none pointer-events-none font-black"
        style={{ fontSize: 64, color: hit ? "rgba(16,185,129,0.07)" : "rgba(0,0,0,0.04)", lineHeight: 1, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
      >
        {stepNum}
      </div>
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          {hit
            ? <Unlock className="w-3 h-3 shrink-0" style={{ color: HIT_COLOR }} />
            : <Lock className="w-3 h-3 shrink-0" style={{ color: accentColor }} />}
          <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: hit ? HIT_COLOR : accentColor }}>
            Step {stepNum} · {hit ? "Unlocked" : "Locked"}
          </span>
        </div>
        <p className="font-extrabold leading-none mb-1" style={{ fontSize: 20, color: hit ? HIT_COLOR : "var(--t-text)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          {formatMoney(ms.amount)}
        </p>
        <p className="text-[12px] font-semibold leading-tight" style={{ color: "var(--t-text)" }}>{ms.label}</p>
        {ms.type === "vial" && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--t-subtle)" }}>Variance test vial</p>
        )}
      </div>
    </motion.div>
  );
}

// ── vote panel ────────────────────────────────────────────────────────────────

interface VotePanelProps {
  gbId: string;
  roundStatus: string;
  peptideOptions: string[];
  testOptions: string[];
  isLoggedIn: boolean;
  isOptedIn: boolean;
  isAdmin: boolean;
  hasVoted: boolean;
  existingVote: { peptideName: string; vialCount: number; testSelections: string[] } | null;
  maxVials: number;
  vialPrice: number;
  onVoted: () => void;
  peptideBatches?: Record<string, string>;
}

function VotePanel({
  gbId, roundStatus, peptideOptions, testOptions,
  isLoggedIn, isOptedIn, isAdmin, hasVoted, existingVote, maxVials, vialPrice, onVoted, peptideBatches,
}: VotePanelProps) {
  const [, setLocation] = useLocation();
  const [voted, setVoted] = useState(hasVoted);
  const [currentVote, setCurrentVote] = useState(existingVote);
  const [editing, setEditing] = useState(false);

  const [peptide, setPeptide] = useState(existingVote?.peptideName ?? "");
  const [vials, setVials] = useState(existingVote?.vialCount ?? 1);
  const [selectedTests, setSelectedTests] = useState<string[]>(existingVote?.testSelections ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const canVote = roundStatus !== "results_received";

  function toggleTest(t: string) {
    setSelectedTests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function submitVote() {
    if (!peptide) return;
    setSubmitting(true);
    setVoteError(null);
    try {
      const r = await fetch(`/api/group-buys/${gbId}/testing/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ peptideName: peptide, vialCount: vials, testSelections: selectedTests }),
      });
      const d = await r.json();
      if (!r.ok) { setVoteError(d.error ?? "Failed to submit vote"); return; }
      setVoted(true);
      setCurrentVote({ peptideName: peptide, vialCount: vials, testSelections: selectedTests });
      setEditing(false);
      onVoted();
    } catch {
      setVoteError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="p-5 flex flex-col items-center text-center gap-3"
        style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", borderRadius: 8 }}>
        <LogIn className="w-7 h-7 opacity-30" style={{ color: "var(--t-muted)" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Sign in to vote</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>Your account shows whether you opted into this pool.</p>
        </div>
        <button onClick={() => setLocation("/account")}
          className="px-4 h-9 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ borderRadius: 6, background: "var(--t-blue)", color: "#fff" }}>
          Sign In
        </button>
      </div>
    );
  }

  if (!isOptedIn) {
    if (isAdmin) {
      return (
        <div className="p-4 text-center"
          style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8 }}>
          <p className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>Admin view — not a participant</p>
        </div>
      );
    }
    return (
      <div className="p-5 text-center"
        style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", borderRadius: 8 }}>
        <Lock className="w-6 h-6 mx-auto mb-2 opacity-30" style={{ color: "var(--t-muted)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Not opted in</p>
        <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>
          Your account didn't opt into testing for this group buy.
        </p>
      </div>
    );
  }

  if (!canVote) {
    return (
      <div className="p-5 text-center" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", borderRadius: 8 }}>
        <p className="text-sm" style={{ color: "var(--t-muted)" }}>Voting has closed — results have been posted.</p>
      </div>
    );
  }

  if (voted && !editing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-5 text-center"
        style={{ background: "rgba(16,185,129,0.07)", border: `1.5px solid ${HIT_COLOR}`, borderRadius: 8 }}
      >
        <CheckCircle2 className="w-8 h-8 mx-auto mb-3" style={{ color: HIT_COLOR }} />
        <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Vote recorded!</p>
        {currentVote && (
          <div className="mt-1.5 space-y-0.5">
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>
              {currentVote.peptideName} · {currentVote.vialCount} vial{currentVote.vialCount !== 1 ? "s" : ""}
            </p>
            {currentVote.testSelections.length > 0 && (
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                Tests: {currentVote.testSelections.join(", ")}
              </p>
            )}
          </div>
        )}
        <button onClick={() => setEditing(true)} className="mt-3 text-xs underline" style={{ color: "var(--t-muted)" }}>
          Change vote
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >

    <div
      className="p-4 sm:p-5 space-y-5"
      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", borderRadius: 8 }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Cast your vote</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>Choose a compound, tests, and vial count.</p>
      </div>

      {/* Compound */}
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--t-muted)" }}>Compound</label>
        <div className="relative">
          <select
            value={peptide}
            onChange={e => setPeptide(e.target.value)}
            className="w-full border px-3 pr-10 appearance-none text-sm h-11"
            style={{
              borderRadius: 6,
              background: "var(--t-surface)",
              border: "1.5px solid var(--t-border)",
              color: peptide ? "var(--t-text)" : "var(--t-muted)",
              fontSize: 16,
            }}
          >
            <option value="">Select a compound…</option>
            {peptideOptions.map(p => {
              const batch = peptideBatches?.[p];
              return <option key={p} value={p}>{p}{batch ? ` — ${batch}` : ""}</option>;
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--t-muted)" }} />
        </div>
      </div>

      {/* Tests */}
      {testOptions.length > 0 && (
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--t-muted)" }}>
            Tests to run <span className="font-normal">(select all that apply)</span>
          </label>
          <div className="space-y-2">
            {testOptions.map(t => {
              const on = selectedTests.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTest(t)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                  style={{
                    borderRadius: 6,
                    border: `1.5px solid ${on ? "var(--t-blue)" : "var(--t-border)"}`,
                    background: on ? "rgba(59,130,246,0.08)" : "var(--t-surface)",
                  }}
                >
                  {on
                    ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
                    : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--t-muted)" }} />}
                  <span className="text-sm font-semibold" style={{ color: on ? "var(--t-text)" : "var(--t-muted)" }}>{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Vials */}
      <div>
        <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--t-muted)" }}>
          How many vials? ({formatMoney(vialPrice)}/vial)
        </label>
        <div className="flex gap-2">
          {Array.from({ length: maxVials }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setVials(n)}
              className="flex-1 text-sm font-semibold h-11 transition-all"
              style={{
                borderRadius: 6,
                background: vials === n ? "var(--t-blue)" : "var(--t-surface)",
                color: vials === n ? "#fff" : "var(--t-text)",
                border: `1.5px solid ${vials === n ? "var(--t-blue)" : "var(--t-border)"}`,
              }}
            >
              {n}v<br />
              <span style={{ fontSize: 10, opacity: 0.8 }}>{formatMoney(n * vialPrice)}</span>
            </button>
          ))}
        </div>
      </div>

      {voteError && (
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#EF4444" }} />
          <p className="text-xs" style={{ color: "#EF4444" }}>{voteError}</p>
        </div>
      )}

      <button
        onClick={submitVote}
        disabled={!peptide || submitting}
        className="w-full h-12 font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
        style={{ borderRadius: 6, background: "var(--t-blue)", color: "#fff", opacity: !peptide || submitting ? 0.5 : 1 }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
        {submitting ? "Submitting…" : "Submit Vote"}
      </button>
      {editing && (
        <button onClick={() => setEditing(false)} className="w-full text-xs text-center" style={{ color: "var(--t-muted)" }}>
          Cancel
        </button>
      )}
    </div>
    </motion.div>
  );
}

// ── late contribution panel ───────────────────────────────────────────────────

function LateContributePanel({ gbId, contributionAmount, anyContribution, onContributed }: {
  gbId: string;
  contributionAmount: number;
  anyContribution: boolean;
  onContributed: () => void;
}) {
  const [amount, setAmount] = useState(String(contributionAmount || 15));
  const [contributing, setContributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function contribute() {
    setContributing(true); setError(null);
    try {
      const r = await fetch(`/api/group-buys/${gbId}/testing/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Failed to contribute"); return; }
      setDone(true);
      onContributed();
    } catch { setError("Network error. Please try again."); }
    finally { setContributing(false); }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="p-5 text-center"
        style={{ borderRadius: 8, background: "rgba(16,185,129,0.07)", border: `1.5px solid ${HIT_COLOR}` }}>
        <CheckCircle2 className="w-8 h-8 mx-auto mb-3" style={{ color: HIT_COLOR }} />
        <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Contribution recorded!</p>
        <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>You can now cast your vote below.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-5 space-y-3"
      style={{ borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.3)" }}>
      <div>
        <p className="text-sm font-bold" style={{ color: "#B45309" }}>Missed the lab test opt-in?</p>
        <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>
          You have an order in this group buy but didn't opt into lab testing. Contribute to the pool to cast your vote.
        </p>
      </div>
      {anyContribution && (
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--t-muted)" }}>
            Contribution amount ($)
          </label>
          <input
            type="number" min="1" step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full border px-3 h-12 text-base"
            style={{ borderRadius: 6, background: "var(--t-surface)", border: "1.5px solid var(--t-border)", color: "var(--t-text)", fontSize: 16 }}
          />
        </div>
      )}
      {!anyContribution && (
        <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>
          Contribution: {formatMoney(contributionAmount)}
        </p>
      )}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#EF4444" }} />
          <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}
      <button
        onClick={contribute}
        disabled={contributing}
        className="w-full h-12 font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
        style={{ borderRadius: 6, background: "#F59E0B", color: "#fff", opacity: contributing ? 0.6 : 1 }}
      >
        {contributing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
        {contributing ? "Contributing…" : `Contribute ${anyContribution && amount ? formatMoney(parseFloat(amount) || 0) : formatMoney(contributionAmount)}`}
      </button>
    </motion.div>
  );
}

// ── test type standings ───────────────────────────────────────────────────────

function TestTypeStandings({ testVotes, allTestOptions, totalVotes }: {
  testVotes: Record<string, number>;
  allTestOptions: string[];
  totalVotes: number;
}) {
  if (totalVotes === 0) {
    return <p className="text-sm text-center py-3" style={{ color: "var(--t-muted)" }}>No votes yet</p>;
  }
  return (
    <div className="space-y-3">
      {allTestOptions.map((test, i) => {
        const count = testVotes[test] ?? 0;
        const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
        const color = RING_COLORS[i % RING_COLORS.length];
        return (
          <motion.div key={test}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold flex-1" style={{ color: "var(--t-text)" }}>{test}</span>
              <span className="text-xs tabular-nums" style={{ color: "var(--t-muted)" }}>
                {count} vote{count !== 1 ? "s" : ""}
              </span>
              <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: "var(--t-muted)" }}>
                {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--t-border)" }}>
              <motion.div className="h-full rounded-full" style={{ background: color }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 + i * 0.06 }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── vial vote standings ───────────────────────────────────────────────────────

function VialStandings({ vialVotes, maxVials, totalVotes }: {
  vialVotes: Record<string, number>;
  maxVials: number;
  totalVotes: number;
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: maxVials }, (_, i) => i + 1).map(n => {
        const count = vialVotes[String(n)] ?? 0;
        const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
        const isTop = maxVials > 1 && count === Math.max(...Array.from({ length: maxVials }, (_, j) => vialVotes[String(j + 1)] ?? 0));
        return (
          <motion.div key={n}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + n * 0.07 }}
            className="flex-1 text-center py-3 px-1"
            style={{
              borderRadius: 6,
              background: isTop ? "rgba(59,130,246,0.08)" : "var(--t-surface2)",
              border: `1.5px solid ${isTop ? "var(--t-blue)" : "var(--t-border)"}`,
            }}
          >
            <p className="text-[22px] font-black leading-none" style={{ color: isTop ? "var(--t-blue)" : "var(--t-text)" }}>
              {n}<span style={{ fontSize: 11, fontWeight: 700 }}>v</span>
            </p>
            <p className="text-[10px] font-semibold mt-1" style={{ color: "var(--t-muted)" }}>
              {count} vote{count !== 1 ? "s" : ""}
            </p>
            {totalVotes > 0 && (
              <p className="text-[10px] tabular-nums" style={{ color: "var(--t-subtle, var(--t-muted))" }}>
                {pct.toFixed(0)}%
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── vote leaderboard ──────────────────────────────────────────────────────────

function VoteLeaderboard({ votes, totalVotes, peptideBatches }: { votes: VoteSummary[]; totalVotes: number; peptideBatches?: Record<string, string> }) {
  if (votes.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: "var(--t-muted)" }}>
        <TestTube className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No votes cast yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {votes.slice(0, 8).map((v, i) => {
        const pct = totalVotes > 0 ? (v.totalVotes / totalVotes) * 100 : 0;
        const barColor = RING_COLORS[Math.min(i, RING_COLORS.length - 1)];
        return (
          <motion.div
            key={v.peptideName}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-6 h-6 flex items-center justify-center shrink-0"
                style={{
                  borderRadius: 4,
                  background: i === 0 ? "rgba(234,179,8,0.15)" : "var(--t-surface2)",
                  border: `1px solid ${i === 0 ? "rgba(234,179,8,0.35)" : "var(--t-border)"}`,
                }}
              >
                {i === 0
                  ? <Trophy className="w-3 h-3" style={{ color: "#CA8A04" }} />
                  : <span className="text-[9px] font-black" style={{ color: "var(--t-subtle)" }}>#{i + 1}</span>}
              </div>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{v.peptideName}</span>
                {peptideBatches?.[v.peptideName] && (
                  <span className="block text-[10px] tabular-nums" style={{ color: "var(--t-muted)" }}>
                    Batch {peptideBatches[v.peptideName]}
                  </span>
                )}
              </span>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
                  {pct.toFixed(1)}%
                </span>
                <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>({v.totalVotes}v)</span>
              </div>
            </div>
            <div className="relative h-1.5 overflow-hidden" style={{ background: "var(--t-border)", borderRadius: 2 }}>
              <motion.div
                className="absolute left-0 top-0 h-full"
                style={{ background: barColor, borderRadius: 2 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.35 + i * 0.05 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── pool layout wrapper ────────────────────────────────────────────────────────

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
  const isAdmin = (() => { try { return !!sessionStorage.getItem("_adm_s") || localStorage.getItem("_adm_lf") === "1"; } catch { return false; } })();

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
    load();
    fetch(`/api/group-buys/${gbId}/info`).then(r => r.json()).then(d => {
      if (d?.name) setGbName(d.name);
    }).catch(() => {});
  }, [gbId, load, refreshKey]);

  useEffect(() => {
    if (!data?.round || data.round.status !== "active") return;
    const t = setInterval(() => setRefreshKey(k => k + 1), 30000);
    return () => clearInterval(t);
  }, [data?.round]);

  if (loading) {
    return (
      <GbPoolLayout title="Testing Pool">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
        </div>
      </GbPoolLayout>
    );
  }

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
    round, poolTotal, contributorCount, votes, totalVotes,
    milestones, thresholds, hasVoted, existingVote, isOptedIn, hasGbOrder,
    peptideOptions, testOptions, testVotes, vialVotes, vialPrice, maxVials,
  } = data;

  const roundColor = STATUS_COLORS[round.status] ?? "var(--t-blue)";
  const lastMilestone = milestones.length > 0 ? milestones[milestones.length - 1] : null;
  const progressPct = lastMilestone
    ? Math.min(100, poolTotal > 0 ? (poolTotal / lastMilestone.amount) * 100 : 0)
    : 0;

  return (
    <GbPoolLayout title={`${gbName ? gbName + " · " : ""}Testing Pool`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6"
      >
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden mb-4 sm:mb-6"
          style={{ borderRadius: 8, background: "linear-gradient(135deg, var(--t-blue-deep, #1B3A7A) 0%, #1e3a8a 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 90% 25%, rgba(255,255,255,0.1) 0%, transparent 55%)" }} />
          <div className="relative px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-4">
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
                <h1 className="text-[22px] font-extrabold text-white leading-tight truncate">{gbName || "Group Buy"}</h1>
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1"
                    style={{ borderRadius: 4, background: "rgba(255,255,255,0.14)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                    {round.status === "active" && (
                      <motion.span className="w-1.5 h-1.5 inline-block shrink-0"
                        style={{ background: "#4ADE80", borderRadius: "50%" }}
                        animate={{ opacity: [1, 0.25, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
                    )}
                    {STATUS_LABELS[round.status] ?? round.status}
                  </span>
                  {!round.anyContribution && (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Opt-in: {formatMoney(round.contributionAmount)}/order
                    </span>
                  )}
                  {round.anyContribution && (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Lab test included
                    </span>
                  )}
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {progressPct.toFixed(1)}% funded
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="w-9 h-9 flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
                style={{ borderRadius: 6, background: "rgba(255,255,255,0.12)" }}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Milestone step cards ── */}
        {milestones.length > 0 && (
          <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
            {milestones.map((ms, i) => (
              <MilestoneCard key={i} ms={ms} index={i} poolTotal={poolTotal} />
            ))}
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-5 lg:space-y-0">

          {/* LEFT: gauge */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="p-6"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
                  Pool Progress
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1"
                  style={{ borderRadius: 4, background: `${roundColor}18`, color: roundColor, border: `1px solid ${roundColor}35` }}>
                  <span className="w-1.5 h-1.5 inline-block" style={{ background: roundColor, borderRadius: "50%" }} />
                  {STATUS_LABELS[round.status] ?? round.status}
                </span>
              </div>
              <PoolGauge poolTotal={poolTotal} milestones={milestones} contributorCount={contributorCount} />
            </motion.div>

            {/* Late contribution panel (desktop) */}
            {isLoggedIn && !isOptedIn && !isAdmin && hasGbOrder && round.status === "active" && (
              <div className="hidden lg:block">
                <LateContributePanel
                  gbId={gbId}
                  contributionAmount={round.contributionAmount}
                  anyContribution={round.anyContribution}
                  onContributed={() => setRefreshKey(k => k + 1)}
                />
              </div>
            )}

            {/* Vote panel on desktop — in left column below gauge */}
            <div className="hidden lg:block">
              <VotePanel
                gbId={gbId}
                roundStatus={round.status}
                peptideOptions={peptideOptions}
                testOptions={testOptions ?? []}
                isLoggedIn={isLoggedIn}
                isOptedIn={isOptedIn}
                isAdmin={isAdmin}
                hasVoted={hasVoted}
                existingVote={existingVote}
                maxVials={maxVials}
                vialPrice={vialPrice}
                onVoted={load}
                peptideBatches={data.peptideBatches}
              />
            </div>
          </div>

          {/* RIGHT: results + leaderboard + breakdown */}
          <div className="space-y-4">
            {/* Results */}
            <AnimatePresence>
              {round.status === "results_received" && round.resultNotes && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 space-y-3"
                  style={{ borderRadius: 8, background: "rgba(16,185,129,0.06)", border: `1.5px solid ${HIT_COLOR}` }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: HIT_COLOR }} />
                    <span className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Results Posted</span>
                    {round.resultPostedAt && (
                      <span className="text-xs ml-auto shrink-0" style={{ color: "var(--t-muted)" }}>
                        {new Date(round.resultPostedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--t-text)" }}>{round.resultNotes}</p>
                  {round.resultPdfUrl && (
                    <a href={round.resultPdfUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--t-blue)" }}>
                      <ExternalLink className="w-4 h-4" />
                      View Full Report
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compound standings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="p-5"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Compound Standings</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
                  </p>
                </div>
                <TestTube className="w-5 h-5 opacity-30" style={{ color: "var(--t-muted)" }} />
              </div>
              <VoteLeaderboard votes={votes} totalVotes={totalVotes} peptideBatches={data.peptideBatches} />
            </motion.div>

            {/* Test types ballot standings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="p-5"
              style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Test Types Ballot</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {testOptions.length} test type{testOptions.length !== 1 ? "s" : ""} on ballot
                  </p>
                </div>
                <FlaskConical className="w-5 h-5 opacity-30" style={{ color: "var(--t-muted)" }} />
              </div>
              <TestTypeStandings testVotes={testVotes ?? {}} allTestOptions={testOptions ?? []} totalVotes={totalVotes} />
            </motion.div>

            {/* Vial vote standings */}
            {maxVials > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                className="p-5"
                style={{ borderRadius: 8, background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Vial Count Votes</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>How many vials members voted for</p>
                  </div>
                  <Trophy className="w-5 h-5 opacity-30" style={{ color: "var(--t-muted)" }} />
                </div>
                <VialStandings vialVotes={vialVotes ?? {}} maxVials={maxVials} totalVotes={totalVotes} />
              </motion.div>
            )}

            {/* Cost breakdown */}
            {thresholds?.leadingPeptide && milestones.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.36 }}
                className="px-5 py-4 space-y-3"
                style={{ borderRadius: 8, background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
              >
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--t-muted)" }}>
                  Cost Breakdown
                </p>
                <div className="space-y-1.5 text-[12px]">
                  {milestones.map((ms, i) => {
                    const prevAmount = i === 0 ? 0 : milestones[i - 1].amount;
                    const cost = ms.amount - prevAmount;
                    return (
                      <div key={i} className="flex justify-between items-baseline">
                        <span style={{ color: "var(--t-muted)" }}>{ms.label}</span>
                        <span className="font-semibold tabular-nums" style={{ color: "var(--t-text)" }}>{formatMoney(cost)}</span>
                      </div>
                    );
                  })}
                  {data?.round?.labShippingCost != null && data.round.labShippingCost > 0 && (
                    <div className="flex justify-between items-baseline">
                      <span style={{ color: "var(--t-muted)" }}>Shipping to lab</span>
                      <span className="font-semibold tabular-nums" style={{ color: "var(--t-text)" }}>{formatMoney(data.round.labShippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2" style={{ borderTop: "1px solid var(--t-border)" }}>
                    <span className="font-bold" style={{ color: "var(--t-text)" }}>Total Target</span>
                    <span className="font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
                      {formatMoney(
                        milestones[milestones.length - 1].amount +
                        (data?.round?.labShippingCost ?? 0)
                      )}
                    </span>
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Target shifts as votes change.</p>
              </motion.div>
            )}

            {/* Late contribution panel (mobile) */}
            {isLoggedIn && !isOptedIn && !isAdmin && hasGbOrder && round.status === "active" && (
              <div className="lg:hidden">
                <LateContributePanel
                  gbId={gbId}
                  contributionAmount={round.contributionAmount}
                  anyContribution={round.anyContribution}
                  onContributed={() => setRefreshKey(k => k + 1)}
                />
              </div>
            )}

            {/* Vote panel on mobile — in right column */}
            <div className="lg:hidden">
              <VotePanel
                gbId={gbId}
                roundStatus={round.status}
                peptideOptions={peptideOptions}
                testOptions={testOptions ?? []}
                isLoggedIn={isLoggedIn}
                isOptedIn={isOptedIn}
                isAdmin={isAdmin}
                hasVoted={hasVoted}
                existingVote={existingVote}
                maxVials={maxVials}
                vialPrice={vialPrice}
                onVoted={load}
                peptideBatches={data.peptideBatches}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </GbPoolLayout>
  );
}
