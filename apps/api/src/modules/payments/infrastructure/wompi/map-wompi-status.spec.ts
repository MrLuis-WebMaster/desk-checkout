import { TransactionStatus } from "@checkout/contracts";
import {
  mapWompiStatus,
  UnsupportedWompiStatusError,
} from "./map-wompi-status";

describe("mapWompiStatus", () => {
  it("maps known Wompi statuses", () => {
    expect(mapWompiStatus("APPROVED")).toBe(TransactionStatus.Approved);
    expect(mapWompiStatus("DECLINED")).toBe(TransactionStatus.Declined);
    expect(mapWompiStatus("PENDING")).toBe(TransactionStatus.Pending);
    expect(mapWompiStatus("VOIDED")).toBe(TransactionStatus.Error);
    expect(mapWompiStatus("ERROR")).toBe(TransactionStatus.Error);
  });

  it("rejects unsupported statuses", () => {
    expect(() => mapWompiStatus("NOPE")).toThrow(UnsupportedWompiStatusError);
    expect(() => mapWompiStatus(undefined)).toThrow(/missing/);
  });
});
