export interface SlipReceiverObserved {
  proxyValue?: string | null;
  accountValue?: string | null;
  displayName?: string | null;
  name?: string | null;
}

export interface ExpectedPromptPayReceiver {
  promptpayId: string;
  promptpayName: string;
}

export function isSlipAmountMatched(
  actualBaht: number | undefined | null,
  expectedBaht: number
): boolean {
  if (typeof actualBaht !== "number" || !Number.isFinite(actualBaht)) {
    return false;
  }
  return Math.abs(actualBaht - expectedBaht) < 0.01;
}

function normalizeDigits(val: string): string {
  return val.replace(/\D/g, "");
}

function matchesMaskedNumber(observedRaw: string, expectedDigits: string): boolean {
  const cleaned = observedRaw.replace(/[^0-9xX*]/g, "").toLowerCase();
  if (!cleaned || expectedDigits.length < 4) return false;

  const observedDigits = normalizeDigits(cleaned);
  if (observedDigits === expectedDigits) return true;

  // Handle Thai bank masked format e.g. "xxx-xxx-6292", "093-xxx-6292", "093xxx6292"
  const last4Expected = expectedDigits.slice(-4);
  if (observedDigits.length >= 4 && observedDigits.endsWith(last4Expected)) {
    const prefixMatch = cleaned.match(/^(\d+)/);
    if (!prefixMatch) return true;
    const prefix = prefixMatch[1]!;
    return expectedDigits.startsWith(prefix);
  }
  return false;
}

function normalizeNameTokens(name: string): string[] {
  return name
    .replace(/(นาย|นางสาว|นาง|น\.ส\.|MR\.?|MRS\.?|MS\.?)/gi, " ")
    .replace(/[^a-zA-Z0-9ก-๙\s]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function matchesReceiverName(observedName: string, expectedName: string): boolean {
  const expectedTokens = normalizeNameTokens(expectedName);
  const observedCompact = normalizeNameTokens(observedName).join(" ");
  if (expectedTokens.length === 0 || !observedCompact) return false;
  return expectedTokens.some((token) => observedCompact.includes(token));
}

export function isSlipReceiverMatched(
  observed: SlipReceiverObserved,
  expected: ExpectedPromptPayReceiver
): boolean {
  const expectedDigits = normalizeDigits(expected.promptpayId);
  const numberCandidates = [observed.proxyValue, observed.accountValue].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  const nameCandidates = [observed.displayName, observed.name].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );

  // If the slip provider returned neither number nor name, cannot verify receiver
  if (numberCandidates.length === 0 && nameCandidates.length === 0) {
    return false;
  }

  const numberMatched =
    expectedDigits.length >= 4 &&
    numberCandidates.some((cand) => matchesMaskedNumber(cand, expectedDigits));
  if (numberMatched) return true;

  const nameMatched =
    expected.promptpayName.trim().length >= 2 &&
    nameCandidates.some((cand) => matchesReceiverName(cand, expected.promptpayName));
  return nameMatched;
}
