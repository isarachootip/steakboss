import { describe, expect, it } from "vitest";
import { buildExecutiveReport, exportOrdersCsv } from "@/services/report.service";

describe("reporting service", () => {
  it("builds executive report with cost gating and CSV export with UTF-8 BOM", async () => {
    const ownerReport = await buildExecutiveReport("all", true);
    expect(ownerReport.summary.grossProfitBaht).toBeDefined();
    expect(ownerReport.reconciliation).toBeDefined();

    const adminReport = await buildExecutiveReport("all", false);
    expect(adminReport.summary.grossProfitBaht).toBeUndefined();

    const csv = await exportOrdersCsv();
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("เลขคำสั่งซื้อ");
  });
});
