import { AdminAuthController, AdminApiError } from "./admin-auth";

// Separate in-memory controller; never impersonate a vendor or install a global fetch interceptor.
export const pepsAdminAuth = new AdminAuthController();

export async function pepsAdminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await pepsAdminAuth.request(path, init);
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401) pepsAdminAuth.onSessionExpired?.();
    throw new AdminApiError(response, body);
  }
  return body as T;
}
