import { expect, it } from "vitest";
import { londonToday, presetRange, shiftRange, reportPath, formatPercent, validRange } from "./reportDates";

it("uses the London calendar date, not UTC", () => {
  expect(londonToday(new Date("2025-06-30T23:30:00Z"))).toBe("2025-07-01");
  expect(londonToday(new Date("2025-01-31T23:30:00Z"))).toBe("2025-01-31");
});
it("builds inclusive preset ranges with Monday weeks", () => {
  expect(presetRange("daily", "2025-05-14")).toEqual({ from: "2025-05-14", to: "2025-05-14" });
  expect(presetRange("weekly", "2025-05-18")).toEqual({ from: "2025-05-12", to: "2025-05-18" });
  expect(presetRange("weekly", "2025-05-12")).toEqual({ from: "2025-05-12", to: "2025-05-18" });
  expect(presetRange("monthly", "2024-02-10")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  expect(presetRange("quarterly", "2025-11-03")).toEqual({ from: "2025-10-01", to: "2025-12-31" });
  expect(presetRange("biannual", "2025-03-03")).toEqual({ from: "2025-01-01", to: "2025-06-30" });
  expect(presetRange("biannual", "2025-07-01")).toEqual({ from: "2025-07-01", to: "2025-12-31" });
});
it("navigates previous and next periods", () => {
  expect(shiftRange("monthly", { from: "2025-03-01", to: "2025-03-31" }, -1)).toEqual({ from: "2025-02-01", to: "2025-02-28" });
  expect(shiftRange("weekly", { from: "2024-12-30", to: "2025-01-05" }, 1)).toEqual({ from: "2025-01-06", to: "2025-01-12" });
  expect(shiftRange("biannual", { from: "2025-01-01", to: "2025-06-30" }, -1)).toEqual({ from: "2024-07-01", to: "2024-12-31" });
  expect(shiftRange("quarterly", { from: "2025-01-01", to: "2025-03-31" }, -1)).toEqual({ from: "2024-10-01", to: "2024-12-31" });
  expect(shiftRange("custom", { from: "2025-03-10", to: "2025-03-12" }, 1)).toEqual({ from: "2025-03-13", to: "2025-03-15" });
  expect(shiftRange("daily", { from: "2025-03-01", to: "2025-03-01" }, -1)).toEqual({ from: "2025-02-28", to: "2025-02-28" });
});
it("validates ranges and builds the request path", () => {
  expect(validRange({ from: "2025-03-02", to: "2025-03-01" })).toBe(false);
  expect(validRange({ from: "2025-02-30", to: "2025-03-01" })).toBe(false);
  expect(validRange({ from: "2025-03-01", to: "2025-03-01" })).toBe(true);
  expect(reportPath({ from: "2025-03-01", to: "2025-03-31" }, "")).toBe("/api/admin/vendor-payments/report?from=2025-03-01&to=2025-03-31");
  expect(reportPath({ from: "2025-03-01", to: "2025-03-31" }, "v 1")).toBe("/api/admin/vendor-payments/report?from=2025-03-01&to=2025-03-31&vendorId=v%201");
});
it("formats margins to two decimals and keeps unavailable explicit", () => {
  expect(formatPercent("12.3456")).toBe("12.35%");
  expect(formatPercent("-4.1")).toBe("-4.10%");
  expect(formatPercent(null)).toBe("Unavailable");
  expect(formatPercent(undefined)).toBe("Unavailable");
  expect(formatPercent("abc")).toBe("Unavailable");
});
