import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/hooks/use-account";

type Scope = "organiser" | "reshipper" | "shared";
type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;
const prefixes = { organiser: "organiser/group-buys", reshipper: "reshipper/gb", shared: "wholesale-shares" };
let active = 0;
const waiting: (() => void)[] = [];
async function limitedLookup(run: () => Promise<Response>, signal: AbortSignal) {
  await new Promise<void>(resolve => {
    const start = () => { active++; resolve(); };
    if (active < 4) start(); else waiting.push(start);
  });
  try {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return await run();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** Automatic, scoped contact lookup; no website-handle fallback. */
export function ManagedTelegramUsername({
  scope, id, username, fetcher = fetch, viewerKey,
}: { scope: Scope; id?: string; username: string; fetcher?: Fetcher; viewerKey?: string }) {
  const { account } = useAccount();
  const element = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(typeof IntersectionObserver === "undefined");
  const bare = username.trim().replace(/^@/, "");
  useEffect(() => {
    if (visible || !element.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "150px" });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [visible]);
  const lookup = useQuery<{ linked: boolean; username: string | null }>({
    queryKey: ["managed-telegram", viewerKey ?? account?.telegramUsername ?? "delegated", scope, id, bare],
    enabled: Boolean(id && bare && visible),
    staleTime: 60_000, gcTime: 0, retry: false,
    queryFn: async ({ signal }) => {
      const response = await limitedLookup(() => fetcher(`/api/${prefixes[scope]}/${encodeURIComponent(id!)}/members/${encodeURIComponent(bare)}/telegram-profile`, {
        credentials: "include", signal,
      }), signal);
      const result = await response.json();
      if (!response.ok) throw new Error("Contact lookup unavailable");
      return result;
    },
  });
  if (!id || !bare) return null;
  return <span ref={element} className="text-xs flex flex-wrap items-center gap-1 font-normal" onClick={event => event.stopPropagation()}>
    <span className="text-muted-foreground">Linked Telegram:</span>
    {lookup.isFetching || !visible ? <span>Looking up…</span> : lookup.isError ? <>
      <span role="status">Lookup unavailable.</span>
      <button type="button" className="underline" onClick={() => void lookup.refetch()}>Retry</button>
    </> : lookup.data ? <>
      {!lookup.data.linked ? <span>Not linked</span> : lookup.data.username
        ? <a className="font-semibold text-blue-600 underline" href={`https://t.me/${encodeURIComponent(lookup.data.username)}`} target="_blank" rel="noopener noreferrer">@{lookup.data.username}</a>
        : <span>No public username set</span>}
      {lookup.data.linked && <button type="button" className="underline text-muted-foreground" onClick={() => void lookup.refetch()}>Refresh</button>}
    </> : <span>Looking up…</span>}
  </span>;
}
