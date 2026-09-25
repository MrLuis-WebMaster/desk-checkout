import type { TransactionDto } from "@checkout/contracts";

export type IdempotencyRecord = {
  transactionId: string;
  requestHash: string;
  response: TransactionDto | null;
  errorCode: string | null;
};

export abstract class IdempotencyStore {
  abstract find(key: string): Promise<IdempotencyRecord | null>;
  abstract begin(
    key: string,
    transactionId: string,
    requestHash: string,
  ): Promise<void>;
  abstract complete(
    key: string,
    response: TransactionDto,
    errorCode?: string,
  ): Promise<void>;
  abstract abort(key: string): Promise<void>;
}
