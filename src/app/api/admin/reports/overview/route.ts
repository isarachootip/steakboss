import { NextResponse } from "next/server";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";
import { buildExecutiveReport, type ReportRange } from "@/services/report.service";

const VALID_RANGES = new Set<ReportRange>(["7d", "30d", "90d", "all"]);

export async function GET(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const rawRange = (searchParams.get("range") || "30d") as ReportRange;
  const range: ReportRange = VALID_RANGES.has(rawRange) ? rawRange : "30d";

  const includeCost = guard.session.role === "OWNER";
  const report = await buildExecutiveReport(range, includeCost);
  return NextResponse.json({ report, includeCost });
}
