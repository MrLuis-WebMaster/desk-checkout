import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DeliveryStatus,
  type CreateDeliveryRequest,
  type DeliveryDto,
} from "@checkout/contracts";
import { DeliveryOrmEntity } from "@checkout/settlement-typeorm";
import { Repository } from "typeorm";
import { DeliveryRepository } from "../../application/ports/delivery-repository.port.js";

@Injectable()
export class TypeOrmDeliveryRepository extends DeliveryRepository {
  constructor(
    @InjectRepository(DeliveryOrmEntity)
    private readonly deliveries: Repository<DeliveryOrmEntity>,
  ) {
    super();
  }

  async save(input: CreateDeliveryRequest): Promise<DeliveryDto> {
    const saved = await this.deliveries.save(
      this.deliveries.create({
        shippingMethodId: input.shippingMethodId,
        addressLine: input.addressLine,
        city: input.city,
        status: DeliveryStatus.Pending,
      }),
    );
    return toDto(saved);
  }

  async findById(id: string): Promise<DeliveryDto | null> {
    const row = await this.deliveries.findOne({ where: { id } });
    return row ? toDto(row) : null;
  }
}

function toDto(row: DeliveryOrmEntity): DeliveryDto {
  return {
    id: row.id,
    shippingMethodId: row.shippingMethodId,
    addressLine: row.addressLine,
    city: row.city,
    status: row.status ?? DeliveryStatus.Pending,
  };
}
