import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { env } from "./config/env.js";
import { WorkerExceptionFilter } from "./shared/presentation/filters/worker-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: "256kb" }));
  app.use(urlencoded({ extended: true, limit: "256kb" }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new WorkerExceptionFilter(httpAdapterHost));

  await app.listen(env.PORT);
}

void bootstrap();
