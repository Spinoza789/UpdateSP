import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../sage-ai", () => ({ callSageAI: vi.fn() }));
import { callSageAI } from "../sage-ai";
import { extractCoADataFromAnyUrl, extractCoADataFromBuffer } from "../gemini-lab-extract";

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("COA import failure boundaries", () => {
  it("explains Janoshik's blocked download instead of reporting an AI failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Cloudflare", { status: 403 })));
    await expect(extractCoADataFromAnyUrl("https://verify.janoshik.com/tests/249731-Retatrutide_40mg_RE401023_D3DUW96M2J1B"))
      .rejects.toMatchObject({ code: "browser_import_required", status: 422 });
    expect(callSageAI).not.toHaveBeenCalled();
  });
  it("still extracts uploaded certificate images without fetching Janoshik", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.mocked(callSageAI).mockResolvedValue(JSON.stringify({
      compound_name: "Retatrutide", batch_code: "RE401023", mg_amount: 40.2, purity_pct: 99.5, confidence: "high",
    }));
    const extracted = await extractCoADataFromBuffer(Buffer.from("fixture-image"), "image/png");
    expect(extracted).toMatchObject({ compoundName: "Retatrutide", batchCode: "RE401023", mgAmount: 40.2, purityPct: 99.5 });
    expect(fetcher).not.toHaveBeenCalled();
    expect(vi.mocked(callSageAI).mock.calls[0][0].messages[0].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "image" }),
    ]));
  });
});
