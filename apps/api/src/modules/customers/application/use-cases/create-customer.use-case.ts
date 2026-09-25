import { Injectable } from "@nestjs/common";
import type {
  CreateCustomerRequest,
  CustomerDto,
} from "@checkout/contracts";
import { ok, type Result } from "#shared/result/result.js";
import { CustomerRepository } from "../ports/customer-repository.port.js";

@Injectable()
export class CreateCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(
    request: CreateCustomerRequest,
  ): Promise<Result<CustomerDto, never>> {
    return ok(await this.customers.save(request));
  }
}
