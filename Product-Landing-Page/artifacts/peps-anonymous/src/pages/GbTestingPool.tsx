import React, { useEffect, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { FlaskConical, Loader2, AlertCircle, TestTube, RefreshCw } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import { HubBottomNav, HubSection } from "@/components/HubBottomNav";

// ── types ─────────────────────────────────────────────────────────────────────

interface TestingRound {
  id: string;
  status: string;
  contributionAmount: number;
  anyContribution: boolean;
  resultNotes: string | null;
  resultPdfUrl: string | null;
  resultPostedAt: string | null;
  testOptions: string[];
  janoshikPaymentUrl: string | null;
}

interface TestingData {
  round: TestingRound | null;
  poolTotal: number;
  contributorCount: number;
  isOptedIn: boolean;
  hasGbOrder: boolean;
  hasVoted: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Collecting",
  closed: "Pool Closed",
  sent_to_lab: "Sent to Lab",
  results_received: "Results In",
};

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

  const { round, poolTotal, contributorCount } = data;

  return (
    <GbPoolLayout title={`${gbName ? gbName + " · " : ""}Testing Pool`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden"
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
                <h1 className="text-[22px] font-extrabold text-white leading-tight truncate">
                  {gbName || "Group Buy"}
                </h1>
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
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {contributorCount} contributor{contributorCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
                    ${poolTotal.toLocaleString()} raised
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

        {/* Content goes here */}
        <div className="py-8 text-center" style={{ color: "var(--t-muted)" }}>
          <TestTube className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Pool content coming soon</p>
        </div>
      </motion.div>
    </GbPoolLayout>
  );
}
