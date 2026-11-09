import { useCallback } from "react";
import { useLocation } from "wouter";
import VendorAccountAuth from "@/components/VendorAccountAuth";
import { Banner } from "@/components/vendor-ui";
import { vendorTranslate as vt } from "@/lib/vendor-language";

/** Dedicated sign-in / sign-up page. The portal itself shows the same gate inline when a visitor is not authorised. */
export default function VendorLogin() {
  const [, navigate] = useLocation();
  const toPortal = useCallback(() => navigate("/vendor"), [navigate]);
  return <>
    {new URLSearchParams(window.location.search).get("usernameChanged") === "1" && <div className="max-w-md mx-auto px-4 pt-4"><Banner tone="success" role="status" testId="text-vendor-username-changed">{vt("Username changed. Sign in with your new username and existing password.")}</Banner></div>}
    <VendorAccountAuth onAuthenticated={toPortal} />
  </>;
}
