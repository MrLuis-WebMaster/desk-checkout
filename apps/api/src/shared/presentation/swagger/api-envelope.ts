import { ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";

export class ApiErrorBodyDto {
  @ApiProperty({ example: "VALIDATION_ERROR" })
  code!: string;

  @ApiProperty({ example: "Validation failed" })
  message!: string;

  @ApiPropertyOptional()
  details?: unknown;
}

export class ApiFailureDto {
  @ApiProperty({ example: false })
  ok!: false;

  @ApiProperty({ type: ApiErrorBodyDto })
  error!: ApiErrorBodyDto;
}

export function apiSuccessSchema(model: new (...args: never[]) => object) {
  return {
    type: "object",
    required: ["ok", "data"],
    properties: {
      ok: { type: "boolean", enum: [true], example: true },
      data: { $ref: getSchemaPath(model) },
    },
  };
}
