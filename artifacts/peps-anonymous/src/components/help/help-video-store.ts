import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount } from "@/hooks/use-account";
import {
  HELP_VIDEO_BY_SLUG, HELP_VIDEOS, cryptoGuideSlug, type CryptoExchange, type CryptoWallet, type HelpVideo, type HelpViewer,
} from "@/data/help-videos";

/* Tiny store behind every "Watch" link: pages only import this file and a text link,
 * and the player itself is loaded the first time a member opens a video. */

export type CryptoChapter = "before-you-start" | "step-1-your-wallet" | "step-2-buy" | "step-3-move-your-coins" | "step-4-pay";
export type HelpVideoRequest =
  | { kind: "video"; slug: string }
  /** The exchange and wallet questions, then the matching guide (optionally starting at one chapter). */
  | { kind: "crypto"; chapter?: CryptoChapter };

let current: HelpVideoRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export function openHelpVideo(slug: string) { if (HELP_VIDEO_BY_SLUG[slug] || findChapterParent(slug)) { current = { kind: "video", slug }; emit(); } }
export function openCryptoGuide(chapter?: CryptoChapter) { current = { kind: "crypto", chapter }; emit(); }
export function closeHelpVideo() { current = null; emit(); }
export function useHelpVideoRequest() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => current, () => null);
}
export function findChapterParent(slug: string): HelpVideo | undefined {
  return HELP_VIDEOS.find(video => video.chapters?.some(chapter => chapter.slug === slug));
}

/* The member's exchange and wallet, remembered in this browser so they are asked once. */
const CRYPTO_KEY = "sp-help-crypto-choice";
export type CryptoChoice = { exchange: CryptoExchange; wallet: CryptoWallet };
export function readCryptoChoice(): CryptoChoice | null {
  try {
    const value = JSON.parse(localStorage.getItem(CRYPTO_KEY) ?? "null");
    return value && HELP_VIDEO_BY_SLUG[cryptoGuideSlug(value.exchange, value.wallet)] ? value : null;
  } catch { return null; }
}
export function saveCryptoChoice(choice: CryptoChoice | null) {
  try { if (choice) localStorage.setItem(CRYPTO_KEY, JSON.stringify(choice)); else localStorage.removeItem(CRYPTO_KEY); } catch { /* private window */ }
}

export function isPhoneScreen() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(max-width: 640px)").matches;
}
/** The phone recording when one exists and the member is on a phone. */
export function playableSlug(video: HelpVideo) { return video.mobileSlug && isPhoneScreen() ? video.mobileSlug : video.slug; }

/* Who is looking: the same facts the streaming route checks on the server. */
let configRequest: Promise<boolean> | null = null;
const wholesaleSwitch = () => configRequest ??= fetch("/api/config").then(r => r.ok ? r.json() : {}).then((c: { wholesaleAccessEnabled?: boolean }) => c.wholesaleAccessEnabled === true).catch(() => { configRequest = null; return false; });
const poolLeaderRequests = new Map<string, Promise<boolean>>();
function poolLeaderApproved(username: string) {
  let request = poolLeaderRequests.get(username);
  if (!request) {
    request = fetch("/api/account/pool-leader/status", { credentials: "include" }).then(r => r.ok ? r.json() : {}).then((b: { status?: string | null }) => b.status === "approved").catch(() => { poolLeaderRequests.delete(username); return false; });
    poolLeaderRequests.set(username, request);
  }
  return request;
}
export function useHelpViewer(): HelpViewer {
  const { account, isLoggedIn } = useAccount();
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [poolLeader, setPoolLeader] = useState(false);
  const username = isLoggedIn ? account?.telegramUsername ?? "" : "";
  useEffect(() => { let live = true; void wholesaleSwitch().then(on => { if (live) setWholesaleEnabled(on); }); return () => { live = false; }; }, []);
  useEffect(() => {
    if (!username) { setPoolLeader(false); return; }
    let live = true;
    void poolLeaderApproved(username).then(on => { if (live) setPoolLeader(on); });
    return () => { live = false; };
  }, [username]);
  return {
    loggedIn: isLoggedIn, organiser: isLoggedIn && account?.organiserStatus === "approved", reshipper: isLoggedIn && account?.reshipperStatus === "approved",
    poolLeader, wholesaleEnabled,
  };
}
