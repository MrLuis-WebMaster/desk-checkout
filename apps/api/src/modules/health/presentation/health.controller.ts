import { Controller, Get } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthDto, TransactionStatus } from "@checkout/contracts";
import { HealthResponseDto } from "./dto/health.response.dto.js";
import { apiSuccessSchema } from "#shared/presentation/swagger/api-envelope.js";

@ApiTags("health")
@ApiExtraModels(HealthResponseDto)
@Controller("health")
export class HealthController {
  @Get()
  @SkipThrottle({ default: true })
  @ApiOperation({ summary: "Estado del servicio" })
  @ApiOkResponse({ schema: apiSuccessSchema(HealthResponseDto) })
  check(): HealthDto {
    return {
      status: "ok",
      transactionStatuses: TransactionStatus,
    };
  }
}
