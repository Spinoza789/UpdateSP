import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, GraduationCap, PlayCircle, Search } from "lucide-react";
import { HELP_VIDEO_BY_SLUG } from "@/data/help-videos";
import { openHelpVideo } from "@/components/help/help-video-store";
import { TOUR_EVENT_START } from "./tour/tour-script";

export interface OrganiserTopbarProps {
  groupName: string;
  groupStatus?: string | null;
  memberCount?: number | null;
  orderCount?: number | null;
  pageLabel: string;
  onOpenMenu: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onSearch: () => void;
  onBack?: () => void;
  primaryAction?: { label: string; onClick: () => void };
  secondaryActions?: ReactNode;
  onProfile?: () => void;
  organiserName?: string;
  organiserRole?: string;
  onChooseGroupBuy?: () => void;
}

const ORGANISER_VIDEO_SLUGS = ["organiser-1-create", "organiser-2-orders", "organiser-3-dispatch", "organiser-4-tools"];

/** "Videos" button beside Tour: a small list of the organiser guide videos. */
function OrganiserVideosMenu() {
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [anchor]);
  const toggle = () => {
    if (anchor) { setAnchor(null); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
  };
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="ov2-secondary-button"
        onClick={toggle}
        title="Watch the organiser videos"
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        data-testid="button-organiser-videos"
      >
        <PlayCircle aria-hidden="true" /> <span className="ov2-action-label">Videos</span>
      </button>
      {anchor ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Organiser videos"
          style={{
            position: "fixed", top: anchor.top, right: anchor.right, zIndex: 60, minWidth: 260, maxWidth: "calc(100vw - 16px)",
            padding: 6, borderRadius: 12, background: "#FFFFFF", border: "1px solid #C8D3DF", boxShadow: "0 12px 32px rgba(15,23,42,0.16)",
          }}
        >
          {ORGANISER_VIDEO_SLUGS.map(slug => {
            const video = HELP_VIDEO_BY_SLUG[slug];
            if (!video) return null;
            return (
              <button
                key={slug}
                type="button"
                role="menuitem"
                onClick={() => { setAnchor(null); openHelpVideo(slug); }}
                data-testid={`organiser-video-${slug}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", minHeight: 40,
                  padding: "8px 10px", borderRadius: 8, textAlign: "left", fontSize: 13, fontWeight: 600, color: "#1B3A7A", background: "transparent",
                }}
              >
                <span>{video.title}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B", flexShrink: 0 }}>{video.length}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function MenuGlyph() {
  return (
    <span className="ov2-menu-glyph" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function OrganiserTopbar({
  groupName,
  pageLabel,
  onOpenMenu,
  onToggleSidebar,
  sidebarCollapsed,
  onSearch,
  onBack,
  primaryAction,
  secondaryActions,
  onProfile,
  organiserName = "Alex Morgan",
  organiserRole = "Lead organiser",
  onChooseGroupBuy,
}: OrganiserTopbarProps) {
  const organiserInitials = organiserName
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="ov2-topbar">
      <div className="ov2-topbar-context-rail" data-tour="topbar-context">
        <button
          type="button"
          className="ov2-choose-gb-button"
          onClick={onChooseGroupBuy}
          aria-label={`Switch group buy — currently ${groupName}`}
          disabled={!onChooseGroupBuy}
        >
          <span className="ov2-choose-gb-kicker">Active group buy</span>
          <span className="ov2-choose-gb-name">{groupName}</span>
          <ChevronRight aria-hidden="true" className="ov2-choose-gb-chevron" />
        </button>
      </div>

      <div className="ov2-topbar-workbar">
        <button
          type="button"
          className="ov2-icon-button ov2-menu-button ov2-menu-button-desktop"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Open navigation" : "Collapse navigation"}
          aria-expanded={!sidebarCollapsed}
        >
          <MenuGlyph />
        </button>
        <button
          type="button"
          className="ov2-icon-button ov2-menu-button ov2-menu-button-drawer"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          aria-haspopup="dialog"
        >
          <MenuGlyph />
        </button>
        {onBack ? (
          <button type="button" className="ov2-icon-button ov2-back-button" onClick={onBack} aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : null}

        <div className="ov2-mobile-group-context">
          <small>Active group buy</small>
          <strong title={groupName}>{groupName}</strong>
        </div>

        <div className="ov2-page-context">
          <strong title={pageLabel}>{pageLabel}</strong>
          <small>GB Organiser workspace</small>
        </div>

        <button type="button" className="ov2-search-trigger" onClick={onSearch} aria-label="Search orders, members, and parcels" data-tour="topbar-search">
          <Search aria-hidden="true" />
          <span>Search orders, members, parcels…</span>
          <kbd aria-hidden="true">⌘ K</kbd>
        </button>

        <div className="ov2-topbar-actions">
          <button
            type="button"
            className="ov2-secondary-button"
            onClick={() => window.dispatchEvent(new CustomEvent(TOUR_EVENT_START))}
            title="Take the guided tour"
            data-tour="topbar-tour-button"
          >
            <GraduationCap aria-hidden="true" /> <span className="ov2-action-label">Tour</span>
          </button>
          <OrganiserVideosMenu />
          {secondaryActions}
          {primaryAction ? (
            <button type="button" className="ov2-primary-button" onClick={primaryAction.onClick}>
              <span>{primaryAction.label}</span>
            </button>
          ) : null}
        </div>

        {onProfile ? (
          <button
            type="button"
            className="ov2-topbar-profile"
            onClick={onProfile}
            aria-label={`Open organiser profile for ${organiserName}`}
            title="Organiser profile"
          >
            <span className="ov2-topbar-avatar" aria-hidden="true">{organiserInitials}</span>
            <span className="ov2-topbar-profile-copy">
              <strong>{organiserName}</strong>
              <small>{organiserRole}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
