type CapacityStatus = "available" | "limited" | "low" | "full";

export interface GroupBuyCapacity {
  stock: number;
  totalOrdered: number;
  status: CapacityStatus;
  unlimited?: boolean;
}

// The capacity API represents unlimited stock as stock=0 plus an explicit flag.
// Never infer that it is sold out from the numeric placeholder or prior orders.
export function groupBuyCapacityFill(cap: GroupBuyCapacity, myQty: number): {
  othersFillPct: number; myFillPct: number; liveStatus: CapacityStatus;
} {
  if (cap.unlimited) return { othersFillPct: 0, myFillPct: 0, liveStatus: "available" };
  const othersFillPct = cap.stock > 0
    ? Math.min(100, Math.round((cap.totalOrdered / cap.stock) * 100))
    : cap.totalOrdered > 0 || cap.status === "full" ? 100 : 0;
  const myFillPct = cap.stock > 0
    ? Math.min(100 - othersFillPct, Math.round((myQty / cap.stock) * 100)) : 0;
  const fill = Math.min(100, othersFillPct + myFillPct);
  return {
    othersFillPct, myFillPct,
    liveStatus: fill >= 95 ? "full" : fill >= 75 ? "low" : fill >= 50 ? "limited" : "available",
  };
}
