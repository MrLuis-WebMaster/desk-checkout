import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  CreateCustomerRequest,
  CustomerDto,
} from "@checkout/contracts";
import { CustomerOrmEntity } from "@checkout/settlement-typeorm";
import { Repository } from "typeorm";
import { CustomerRepository } from "../../application/ports/customer-repository.port.js";

@Injectable()
export class TypeOrmCustomerRepository extends CustomerRepository {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly customers: Repository<CustomerOrmEntity>,
  ) {
    super();
  }

  async save(input: CreateCustomerRequest): Promise<CustomerDto> {
    const saved = await this.customers.save(
      this.customers.create({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
      }),
    );
    return toDto(saved);
  }

  async findById(id: string): Promise<CustomerDto | null> {
    const row = await this.customers.findOne({ where: { id } });
    return row ? toDto(row) : null;
  }
}

function toDto(row: CustomerOrmEntity): CustomerDto {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
  };
}
