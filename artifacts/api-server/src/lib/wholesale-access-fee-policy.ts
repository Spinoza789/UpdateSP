export type AccessFeeRequest = {
  status: string;
  amountUsd: number;
  testPaymentTxHash: string | null;
  paymentTxHash: string | null;
  paymentCryptoCurrency: string | null;
  paymentCryptoNetwork: string | null;
};

export function parseAccessFee(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (value === "") return null;
  const fee = Number(value);
  return Number.isSafeInteger(fee) && fee > 0 ? fee : null;
}

export function accessFeeReview(request: AccessFeeRequest, currentFee: number | null) {
  // A saved rail means payment instructions have already been issued, even
  // when the member has not submitted a transaction hash yet.
  const paymentStarted = Boolean(
    request.testPaymentTxHash || request.paymentTxHash ||
    request.paymentCryptoCurrency || request.paymentCryptoNetwork,
  );
  const outdatedHigherFee = request.status === "pending" &&
    parseAccessFee(currentFee) !== null && request.amountUsd > currentFee!;
  return { outdatedHigherFee, canReplace: outdatedHigherFee && !paymentStarted, paymentStarted };
}
