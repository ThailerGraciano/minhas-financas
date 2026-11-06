import { describe, expect, it } from "vitest";
import {
  DASHBOARD_WIDGETS_META,
  DEFAULT_ADVANCED_CHARTS_ORDER,
  getDefaultDashboardLayout,
  isDefaultDashboardLayout,
  moveArrayItem,
  parseDashboardLayout,
  reorderWidgetsById,
} from "../dashboard-layout";

describe("dashboard-layout utils", () => {
  it("returns default layout when raw JSON is null or invalid", () => {
    const def = getDefaultDashboardLayout();
    expect(parseDashboardLayout(null)).toEqual(def);
    expect(parseDashboardLayout("not-json")).toEqual(def);
    expect(parseDashboardLayout("{}")).toEqual(def);
    expect(isDefaultDashboardLayout(def)).toBe(true);
  });

  it("reorders widgets by id and detects custom layout", () => {
    const def = getDefaultDashboardLayout();
    const reordered = reorderWidgetsById(def.widgets, "open-invoices", "health-summary");

    expect(reordered[0].id).toBe("open-invoices");
    expect(reordered[1].id).toBe("health-summary");
    expect(reordered.length).toBe(DASHBOARD_WIDGETS_META.length);

    const customState = { ...def, widgets: reordered };
    expect(isDefaultDashboardLayout(customState)).toBe(false);
  });

  it("preserves saved order, colSpan, and visibility while filling missing default widgets", () => {
    const partialJson = JSON.stringify({
      version: 1,
      widgets: [
        { id: "open-invoices", colSpan: 3, visible: true },
        { id: "balance-evolution", colSpan: 3, visible: false },
      ],
      advancedChartsOrder: ["purchasing-power", "global-income-expense"],
      advancedAnalyticsOpen: true,
    });

    const parsed = parseDashboardLayout(partialJson);
    expect(parsed.widgets[0]).toEqual({ id: "open-invoices", colSpan: 3, visible: true });
    expect(parsed.widgets[1]).toEqual({ id: "balance-evolution", colSpan: 3, visible: false });
    expect(parsed.widgets.length).toBe(DASHBOARD_WIDGETS_META.length);
    expect(parsed.advancedChartsOrder.slice(0, 2)).toEqual(["purchasing-power", "global-income-expense"]);
    expect(parsed.advancedChartsOrder.length).toBe(DEFAULT_ADVANCED_CHARTS_ORDER.length);
    expect(parsed.advancedAnalyticsOpen).toBe(true);
  });

  it("moves array items safely", () => {
    expect(moveArrayItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveArrayItem(["a", "b", "c"], 0, 0)).toEqual(["a", "b", "c"]);
    expect(moveArrayItem(["a", "b", "c"], -1, 1)).toEqual(["a", "b", "c"]);
  });
});

