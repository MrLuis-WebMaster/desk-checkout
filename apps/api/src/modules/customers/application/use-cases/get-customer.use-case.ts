import { Injectable } from "@nestjs/common";
import type { CustomerDto } from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { CustomerNotFoundError } from "../../domain/customer/errors.js";
import { CustomerRepository } from "../ports/customer-repository.port.js";

@Injectable()
export class GetCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(
    id: string,
  ): Promise<Result<CustomerDto, CustomerNotFoundError>> {
    const customer = await this.customers.findById(id);
    if (!customer) {
      return err(new CustomerNotFoundError(id));
    }
    return ok(customer);
  }
}
