import { TransactionStatus } from "@checkout/contracts";

export class UnsupportedWompiStatusError extends Error {
  constructor(status: string | undefined) {
    super(`Unsupported Wompi status: ${status ?? "missing"}`);
    this.name = "UnsupportedWompiStatusError";
  }
}

export function mapWompiStatus(status: string | undefined): TransactionStatus {
  switch (status) {
    case "APPROVED":
      return TransactionStatus.Approved;
    case "DECLINED":
      return TransactionStatus.Declined;
    case "PENDING":
      return TransactionStatus.Pending;
    case "VOIDED":
    case "ERROR":
      return TransactionStatus.Error;
    default:
      throw new UnsupportedWompiStatusError(status);
  }
}
