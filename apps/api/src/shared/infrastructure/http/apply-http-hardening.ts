import { json, urlencoded } from "express";
import helmet from "helmet";
import type { INestApplication } from "@nestjs/common";
import { resolveTrustProxy } from "./trust-proxy.js";

const BODY_LIMIT = "256kb";

export type HttpHardeningOptions = {
  nodeEnv: string;
  trustProxyEnv?: string;
  enableSwaggerCsp: boolean;
};

export function applyApiHttpHardening(
  app: INestApplication,
  options: HttpHardeningOptions,
): void {
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: boolean | number) => void;
  };
  expressApp.set(
    "trust proxy",
    resolveTrustProxy(options.nodeEnv, options.trustProxyEnv),
  );

  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));

  if (options.enableSwaggerCsp) {
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
    return;
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
}
