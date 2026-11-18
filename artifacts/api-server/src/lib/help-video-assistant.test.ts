import { describe, expect, it } from "vitest";
import { HELP_VIDEOS, HELP_VIDEO_BY_SLUG, canWatchHelpVideo, type HelpViewer } from "../../../peps-anonymous/src/data/help-videos";
import {
  applyTelegramVideoMarker, buildSageHelpVideoBlock, buildTelegramHelpVideoBlock, extractVideoSlugs,
  filterVideoSlugs, sageHelpVideos, telegramHelpVideos,
} from "./help-video-assistant";

const SITE = "https://example.test";
const visibleTo = (viewer: HelpViewer) => HELP_VIDEOS.filter(video => canWatchHelpVideo(video, viewer));
const member: HelpViewer = { loggedIn: true, organiser: false, reshipper: false, poolLeader: false, vendor: false, wholesaleEnabled: false };
const organiser: HelpViewer = { ...member, organiser: true };
const everything: HelpViewer = { loggedIn: true, organiser: true, reshipper: true, poolLeader: true, vendor: true, wholesaleEnabled: true };

describe("Sage guide video list", () => {
  it("never offers phone recordings or vendor videos, whoever is asking", () => {
    const videos = sageHelpVideos(visibleTo(everything));
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.some(video => video.phoneVersion)).toBe(false);
    expect(videos.some(video => video.audience === "vendor")).toBe(false);
  });

  it("lists only the videos the member's role allows", () => {
    const memberBlock = buildSageHelpVideoBlock(sageHelpVideos(visibleTo(member)));
    const organiserBlock = buildSageHelpVideoBlock(sageHelpVideos(visibleTo(organiser)));
    expect(memberBlock).toContain("- ordering-and-paying | Ordering and paying | ");
    expect(memberBlock).toContain("keywords: order, checkout");
    expect(memberBlock).not.toContain("organiser-2-orders");
    expect(memberBlock).not.toContain("- wholesale |");
    expect(memberBlock).not.toContain("dashboard-mobile");
    expect(memberBlock).not.toContain("vendor-portal");
    expect(organiserBlock).toContain("- organiser-2-orders | ");
  });

  it("carries its own instructions and the block format", () => {
    const block = buildSageHelpVideoBlock(sageHelpVideos(visibleTo(member)));
    expect(block).toContain("Do not answer from your own knowledge");
    expect(block).toContain("support ticket");
    expect(block).toContain("/help");
    expect(block).toContain("Never invent a slug");
    expect(block).toContain('VIDEOS_JSON_START["slug-one","slug-two"]VIDEOS_JSON_END');
  });

  it("still gives the rules when there are no videos to offer", () => {
    const block = buildSageHelpVideoBlock([]);
    expect(block).toContain("no guide videos are available");
    expect(block).toContain("/help");
  });
});

describe("VIDEOS_JSON parsing", () => {
  it("pulls the slugs out and strips the block from the text", () => {
    const { text, slugs } = extractVideoSlugs('Here is a guide.\nVIDEOS_JSON_START["ordering-and-paying","batch-system"]VIDEOS_JSON_END');
    expect(slugs).toEqual(["ordering-and-paying", "batch-system"]);
    expect(text.trim()).toBe("Here is a guide.");
  });

  it("leaves other blocks alone", () => {
    const { text } = extractVideoSlugs('Hi CHIPS_JSON_START["a"]CHIPS_JSON_END VIDEOS_JSON_START[]VIDEOS_JSON_END');
    expect(text).toContain('CHIPS_JSON_START["a"]CHIPS_JSON_END');
    expect(text).not.toContain("VIDEOS_JSON");
  });

  it("copes with no block, broken JSON and non-string entries", () => {
    expect(extractVideoSlugs("Just text")).toEqual({ text: "Just text", slugs: [] });
    expect(extractVideoSlugs("x VIDEOS_JSON_START[oops]VIDEOS_JSON_END").slugs).toEqual([]);
    expect(extractVideoSlugs("x VIDEOS_JSON_START[oops]VIDEOS_JSON_END").text.trim()).toBe("x");
    expect(extractVideoSlugs('VIDEOS_JSON_START[1,null," half-kits ",""]VIDEOS_JSON_END').slugs).toEqual(["half-kits"]);
  });

  it("drops slugs the viewer may not see, repeats, and anything past two", () => {
    const allowed = sageHelpVideos(visibleTo(member));
    expect(filterVideoSlugs(["organiser-2-orders", "made-up", "vendor-portal", "dashboard-mobile", "wholesale"], allowed)).toEqual([]);
    expect(filterVideoSlugs(["half-kits", "half-kits", "made-up", "batch-system", "uther-gb"], allowed)).toEqual(["half-kits", "batch-system"]);
    expect(filterVideoSlugs(["organiser-2-orders"], sageHelpVideos(visibleTo(organiser)))).toEqual(["organiser-2-orders"]);
    expect(filterVideoSlugs(["half-kits"], [])).toEqual([]);
  });
});

describe("Telegram support bot guide videos", () => {
  it("offers only public videos that are not wholesale or phone recordings", () => {
    const videos = telegramHelpVideos();
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.every(video => video.audience === "public" && !video.wholesale && !video.phoneVersion)).toBe(true);
    const block = buildTelegramHelpVideoBlock();
    expect(block).toContain("- ordering-and-paying | ");
    expect(block).toContain("VIDEO: <slug>");
    for (const video of HELP_VIDEOS.filter(v => v.audience !== "public" || v.wholesale || v.phoneVersion)) {
      expect(block).not.toContain(`- ${video.slug} |`);
    }
  });

  it("turns the marker into one last line with the title and link", () => {
    const title = HELP_VIDEO_BY_SLUG["ordering-and-paying"].title;
    expect(applyTelegramVideoMarker("Add items and check out.\nVIDEO: ordering-and-paying", SITE))
      .toBe(`Add items and check out.\n\n${title}: ${SITE}/help/ordering-and-paying`);
    expect(applyTelegramVideoMarker("Sure.\n  video: <Ordering-And-Paying>  \n", `${SITE}/`))
      .toBe(`Sure.\n\n${title}: ${SITE}/help/ordering-and-paying`);
  });

  it("drops a marker whose slug is unknown or not public", () => {
    expect(applyTelegramVideoMarker("Answer.\nVIDEO: made-up-video", SITE)).toBe("Answer.");
    expect(applyTelegramVideoMarker("Answer.\nVIDEO: organiser-2-orders", SITE)).toBe("Answer.");
    expect(applyTelegramVideoMarker("Answer.\nVIDEO: wholesale", SITE)).toBe("Answer.");
    expect(applyTelegramVideoMarker("Answer.\nVIDEO: dashboard-mobile", SITE)).toBe("Answer.");
    expect(applyTelegramVideoMarker("Answer.\nVIDEO:", SITE)).toBe("Answer.");
  });

  it("keeps a single link even when the model writes two markers", () => {
    const out = applyTelegramVideoMarker("Answer.\nVIDEO: half-kits\nVIDEO: batch-system", SITE);
    expect(out).toBe(`Answer.\n\n${HELP_VIDEO_BY_SLUG["half-kits"].title}: ${SITE}/help/half-kits`);
  });

  it("leaves a reply with no marker unchanged", () => {
    expect(applyTelegramVideoMarker("Plain answer.\nSecond line.", SITE)).toBe("Plain answer.\nSecond line.");
    expect(applyTelegramVideoMarker("  ", SITE)).toBe("");
  });
});
