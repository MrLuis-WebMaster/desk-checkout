import type { TransactionDto } from "@checkout/contracts";
import {
  IdempotencyConflictError,
  IdempotencyStore,
  type IdempotencyRecord,
} from "@checkout/settlement";
import { Repository } from "typeorm";
import { IdempotencyKeyOrmEntity } from "./idempotency-key.orm-entity.js";
import { isUniqueViolation } from "./is-unique-violation.js";

/** Nest-free TypeORM idempotency store. Maps Postgres 23505 → IdempotencyConflictError. */
export class TypeOrmIdempotencyStore extends IdempotencyStore {
  constructor(
    private readonly keys: Repository<IdempotencyKeyOrmEntity>,
  ) {
    super();
  }

  async find(key: string): Promise<IdempotencyRecord | null> {
    const row = await this.keys.findOne({ where: { key } });
    if (!row) {
      return null;
    }
    return {
      transactionId: row.transactionId,
      requestHash: row.requestHash,
      response: row.responseJson,
      errorCode: row.errorCode,
    };
  }

  async begin(
    key: string,
    transactionId: string,
    requestHash: string,
  ): Promise<void> {
    try {
      await this.keys.insert({
        key,
        transactionId,
        requestHash,
        responseJson: null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new IdempotencyConflictError();
      }
      throw error;
    }
  }

  async complete(
    key: string,
    response: TransactionDto,
    errorCode?: string,
  ): Promise<void> {
    await this.keys.update(
      { key },
      { responseJson: response, errorCode: errorCode ?? null },
    );
  }

  async abort(key: string): Promise<void> {
    await this.keys.delete({ key });
  }
}
