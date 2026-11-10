import { afterEach, expect, it, vi } from "vitest";
import { AdminAuthController } from "./admin-auth";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it("uses the existing Admin session CSRF contract rather than vendor identity", async () => {
  const calls: Array<{url: string; init?: RequestInit}> = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
    calls.push({ url: input, init });
    const data = input.endsWith("/status") ? {twoFactorEnabled:false}
      : input.endsWith("/legacy-me") ? {username:"admin",csrfToken:"fixture-admin-csrf",rememberMe:true}
      : {ok:true};
    return new Response(JSON.stringify(data), {headers:{"content-type":"application/json"}});
  }));
  const {pepsAdminAuth, pepsAdminJson} = await import("./peps-admin");
  expect(pepsAdminAuth).toBeInstanceOf(AdminAuthController);
  await pepsAdminAuth.initialize();
  await pepsAdminAuth.restoreSession();
  await pepsAdminJson("/admin/vendor-portal/orders/fixture", {
    method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"processing"}),
  });
  const mutation = calls.at(-1)!;
  expect(mutation.url).toBe("/api/admin/vendor-portal/orders/fixture");
  expect(mutation.init?.credentials).toBe("include");
  const headers = new Headers(mutation.init?.headers);
  expect(headers.get("x-admin-csrf")).toBe("fixture-admin-csrf");
  expect(headers.has("x-vendor-csrf")).toBe(false);
  expect(headers.has("x-impersonate-username")).toBe(false);
});

it("rejects a failed request and notifies the page when Admin authorization expires", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({error:"Unauthorized"}), {
    status:401,headers:{"content-type":"application/json"},
  })));
  const {pepsAdminAuth, pepsAdminJson} = await import("./peps-admin");
  const expired = vi.fn();
  pepsAdminAuth.onSessionExpired = expired;
  await expect(pepsAdminJson("/admin/vendor-portal/orders")).rejects.toThrow("Unauthorized");
  expect(expired).toHaveBeenCalledTimes(1);
});
