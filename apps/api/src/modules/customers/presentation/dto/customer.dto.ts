import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type {
  CreateCustomerRequest,
  CustomerDto,
} from "@checkout/contracts";

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateCustomerDto implements CreateCustomerRequest {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsEmail()
  email!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;
}

export class CustomerParamsDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  id!: string;
}

export class CustomerResponseDto implements CustomerDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;
}
