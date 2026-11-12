import { PlayCircle } from "lucide-react";
import { GuideVideoPlayer } from "./GuideVideoPlayer";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";

const GUIDES: Record<string, { name: string; title: string }> = {
  UAJBM: { name: "HGH 36IU", title: "How the batch system works" },
  "5ZZ87": { name: "Uther GB - November - @ajer6130", title: "Uther group-buy guide" },
};

/** Explicit group allowlist: never expose a group's video on other group buys. */
export function HghBatchGuide({ groupBuyId }: { groupBuyId?: string | null }) {
  const guide = groupBuyId ? GUIDES[groupBuyId] : undefined;
  if (!guide) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.15)" }}
          title={`${guide.title} · 2 min video`}
        >
          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Batch guide
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-xl">
      <DialogTitle>{guide.title}</DialogTitle>
      <DialogDescription>
        Watch this short guide for your {guide.name} order.
      </DialogDescription>
      <GuideVideoPlayer
        label={`${guide.name} video guide`}
        src={`/api/group-buys/${groupBuyId}/batch-guide.mp4`}
      />
      </DialogContent>
    </Dialog>
  );
}
