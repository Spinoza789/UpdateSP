import { useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

export function formatVideoTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Inline-only playback: controls belong to the modal, not the mobile OS player. */
export function GuideVideoPlayer({ src, label }: { src: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function togglePlayback() {
    const media = video.current;
    if (!media) return;
    if (!media.paused) { media.pause(); return; }
    setError("");
    setLoading(true);
    try {
      await media.play();
    } catch {
      setError("The video could not play. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const buttonClass = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400";

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#162231] text-white">
      <div className="relative">
        <video
          ref={video}
          className="aspect-video w-full bg-black"
          aria-label={label}
          playsInline
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          src={src}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setLoading(false); }}
          onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={event => setDuration(event.currentTarget.duration)}
          onVolumeChange={event => setMuted(event.currentTarget.muted)}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => { setLoading(false); setError("The video could not load. Please refresh and try again."); }}
        />
        {!playing && !loading && (
          <button type="button" aria-label="Play video" onClick={togglePlayback}
            className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2D6BCC] text-white shadow-lg hover:bg-[#1B3A7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <Play className="h-7 w-7" aria-hidden="true" />
          </button>
        )}
        {loading && <span role="status" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/75 px-4 py-2 text-sm">Loading video…</span>}
      </div>
      <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
        <button type="button" className={buttonClass} aria-label={playing ? "Pause video" : "Play video"} onClick={togglePlayback}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <span className="shrink-0 text-[11px] tabular-nums" aria-live="off">{formatVideoTime(time)} / {formatVideoTime(duration)}</span>
        <input
          type="range"
          aria-label="Seek video"
          aria-valuetext={`${formatVideoTime(time)} of ${formatVideoTime(duration)}`}
          min={0} max={Number.isFinite(duration) && duration > 0 ? duration : 0}
          step={0.1} value={time} disabled={!Number.isFinite(duration) || duration <= 0}
          className="h-8 min-w-0 flex-1 cursor-pointer accent-[#60A5FA]"
          onChange={event => {
            if (!video.current) return;
            const next = Number(event.currentTarget.value);
            video.current.currentTime = next;
            setTime(next);
          }}
        />
        <button type="button" className={buttonClass} aria-label={muted ? "Unmute video" : "Mute video"} onClick={() => {
          if (video.current) video.current.muted = !video.current.muted;
        }}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
