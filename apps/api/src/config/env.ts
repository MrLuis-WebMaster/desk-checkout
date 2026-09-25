import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ });

export const apiEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(httpUrl).min(1)),
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5433),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** When false, skip `/docs` and Swagger CSP relaxations. Default true for the public OpenAPI deliverable. */
  ENABLE_SWAGGER: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((value) => value === undefined || value === "1" || value === "true"),
  RABBITMQ_URL: z.string().min(1).default("amqp://guest:guest@localhost:5672"),
  WOMPI_BASE_URL: z.string().default(""),
  WOMPI_PUBLIC_KEY: z.string().default(""),
  WOMPI_PRIVATE_KEY: z.string().default(""),
  WOMPI_INTEGRITY_SECRET: z.string().default(""),
  WOMPI_EVENTS_SECRET: z.string().default(""),
  WEBHOOK_MAX_SKEW_SECONDS: z.coerce.number().int().positive().default(300),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "test") {
    return;
  }
  const required = [
    "WOMPI_PUBLIC_KEY",
    "WOMPI_PRIVATE_KEY",
    "WOMPI_INTEGRITY_SECRET",
    "WOMPI_EVENTS_SECRET",
    "RABBITMQ_URL",
  ] as const;
  if (value.NODE_ENV === "production" && value.WOMPI_BASE_URL.trim().length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["WOMPI_BASE_URL"],
      message: "Required",
    });
  } else if (
    value.WOMPI_BASE_URL.trim().length > 0 &&
    !/^https?:\/\//.test(value.WOMPI_BASE_URL)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["WOMPI_BASE_URL"],
      message: "Must be an http(s) URL",
    });
  }
  for (const key of required) {
    if (value[key].trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "Required",
      });
    }
  }
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

const API_ENV_KEYS = [
  "PORT",
  "CORS_ORIGIN",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "NODE_ENV",
  "ENABLE_SWAGGER",
  "RABBITMQ_URL",
  "WOMPI_BASE_URL",
  "WOMPI_PUBLIC_KEY",
  "WOMPI_PRIVATE_KEY",
  "WOMPI_INTEGRITY_SECRET",
  "WOMPI_EVENTS_SECRET",
  "WEBHOOK_MAX_SKEW_SECONDS",
] as const;

export function loadEnvironment(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      loadDotenv({ path });
      return;
    }
  }
}

function present(source: NodeJS.ProcessEnv): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of API_ENV_KEYS) {
    const value = source[key];
    if (value !== undefined && value.trim() !== "") {
      values[key] = value;
    }
  }
  return values;
}

export function parseApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = apiEnvSchema.safeParse(present(source));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid API environment:\n${details}`);
  }
  const data = parsed.data;
  if (data.NODE_ENV !== "production" && data.WOMPI_BASE_URL.trim().length === 0) {
    return { ...data, WOMPI_BASE_URL: "https://sandbox.wompi.co/v1" };
  }
  return data;
}

loadEnvironment();

export const env = parseApiEnv();
