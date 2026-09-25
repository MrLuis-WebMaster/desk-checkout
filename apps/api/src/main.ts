import { ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { env } from "#config/env.js";
import { applyApiHttpHardening } from "#shared/infrastructure/http/apply-http-hardening.js";
import { ApiExceptionFilter } from "#shared/presentation/filters/api-exception.filter.js";
import { ApiSuccessInterceptor } from "#shared/presentation/interceptors/api-success.interceptor.js";
import { setupSwagger } from "#shared/presentation/swagger/setup-swagger.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const enableSwagger = env.NODE_ENV !== "production";

  applyApiHttpHardening(app, {
    nodeEnv: env.NODE_ENV,
    trustProxyEnv: process.env.TRUST_PROXY,
    enableSwaggerCsp: enableSwagger,
  });

  app.enableCors({
    origin: env.CORS_ORIGIN,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ApiExceptionFilter(httpAdapterHost));
  app.useGlobalInterceptors(new ApiSuccessInterceptor());

  if (enableSwagger) {
    setupSwagger(app);
  }

  await app.listen(env.PORT);
}

void bootstrap();
