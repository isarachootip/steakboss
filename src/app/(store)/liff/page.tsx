import { sanitizeNextPath } from "@/services/line-login.service";
import { LiffEntryView } from "@/components/store/LiffEntryView";

export const dynamic = "force-dynamic";

export default async function LiffEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next ? sanitizeNextPath(next) : "/#menu";
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim() ?? "";

  return <LiffEntryView liffId={liffId} nextPath={safeNext} />;
}
