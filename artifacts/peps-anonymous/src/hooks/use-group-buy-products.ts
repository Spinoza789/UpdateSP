import { useQuery } from "@tanstack/react-query";

export type GroupOrderProduct = {
  id: string;
  name: string;
  price: number;
  feePerKit: number;
  description: string | null;
  sortOrder: number;
  category: string | null;
  mgSize: string | null;
  halfKitEnabled?: boolean;
  maxPerCustomer?: number | null;
  labReportId?: number | null;
};

export async function fetchGroupOrderProducts(groupId: string, signal?: AbortSignal): Promise<GroupOrderProduct[]> {
  const response = await fetch(`/api/group-buys/${encodeURIComponent(groupId)}/products`, { credentials: "include", signal });
  if (!response.ok) throw new Error("Could not load product prices and kit fees. Please retry.");
  const products = await response.json();
  if (!Array.isArray(products) || products.some(product =>
    typeof product?.id !== "string" || typeof product.feePerKit !== "number"
    || !Number.isFinite(product.feePerKit) || product.feePerKit < 0)) {
    throw new Error("Could not load current kit fees. Please refresh the page and retry.");
  }
  return products;
}

export function useGroupBuyProducts(groupId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["gb-products", groupId],
    queryFn: ({ signal }) => fetchGroupOrderProducts(groupId!, signal),
    enabled: Boolean(groupId) && enabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 60_000,
    retry: false,
  });
}
