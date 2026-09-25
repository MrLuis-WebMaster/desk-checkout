import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerOrmEntity } from "@checkout/settlement-typeorm";
import { CustomerRepository } from "../application/ports/customer-repository.port.js";
import { CreateCustomerUseCase } from "../application/use-cases/create-customer.use-case.js";
import { GetCustomerUseCase } from "../application/use-cases/get-customer.use-case.js";
import { TypeOrmCustomerRepository } from "../infrastructure/typeorm/typeorm-customer-repository.js";
import { CustomersController } from "./controllers/customers.controller.js";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrmEntity])],
  controllers: [CustomersController],
  providers: [
    CreateCustomerUseCase,
    GetCustomerUseCase,
    {
      provide: CustomerRepository,
      useClass: TypeOrmCustomerRepository,
    },
  ],
})
export class CustomersModule {}
