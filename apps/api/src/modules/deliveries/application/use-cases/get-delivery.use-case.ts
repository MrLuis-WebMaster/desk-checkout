import { Injectable } from "@nestjs/common";
import type { DeliveryDto } from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { DeliveryNotFoundError } from "../../domain/delivery/errors.js";
import { DeliveryRepository } from "../ports/delivery-repository.port.js";

@Injectable()
export class GetDeliveryUseCase {
  constructor(private readonly deliveries: DeliveryRepository) {}

  async execute(
    id: string,
  ): Promise<Result<DeliveryDto, DeliveryNotFoundError>> {
    const delivery = await this.deliveries.findById(id);
    if (!delivery) {
      return err(new DeliveryNotFoundError(id));
    }
    return ok(delivery);
  }
}
