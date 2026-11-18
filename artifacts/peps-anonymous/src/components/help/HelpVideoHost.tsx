import { lazy, Suspense } from "react";
import { useHelpVideoRequest } from "./help-video-store";

const HelpVideoPlayer = lazy(() => import("./HelpVideoPlayer"));

/** Mounted once for the whole site. Loads the player only when a member opens a video. */
export function HelpVideoHost() {
  const request = useHelpVideoRequest();
  if (!request) return null;
  return <Suspense fallback={null}><HelpVideoPlayer request={request} /></Suspense>;
}
