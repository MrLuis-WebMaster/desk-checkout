import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { TransactionDto } from "@checkout/contracts";
import { Repository } from "typeorm";
import {
  IdempotencyStore,
  type IdempotencyRecord,
} from "../../application/ports/idempotency-store.port.js";
import { IdempotencyKeyOrmEntity } from "./idempotency-key.orm-entity.js";

@Injectable()
export class TypeOrmIdempotencyStore extends IdempotencyStore {
  constructor(
    @InjectRepository(IdempotencyKeyOrmEntity)
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
    await this.keys.insert({ key, transactionId, requestHash, responseJson: null });
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
