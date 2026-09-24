import { ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { env } from "./config/env.js";
import { ApiExceptionFilter } from "#shared/presentation/filters/api-exception.filter.js";
import { ApiSuccessInterceptor } from "#shared/presentation/interceptors/api-success.interceptor.js";
import { setupSwagger } from "#shared/presentation/swagger/setup-swagger.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "validator.swagger.io"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

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

  if (env.NODE_ENV !== "production") {
    setupSwagger(app);
  }

  await app.listen(env.PORT);
}

void bootstrap();
