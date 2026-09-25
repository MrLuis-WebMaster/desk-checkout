import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

export const workerEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5433),
  DB_USER: z.string().min(1).default("checkout"),
  DB_PASSWORD: z.string().min(1).default("checkout"),
  DB_NAME: z.string().min(1).default("checkout"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  WOMPI_BASE_URL: z.string().default(""),
  WOMPI_PUBLIC_KEY: z.string().default(""),
  WOMPI_PRIVATE_KEY: z.string().default(""),
  WOMPI_INTEGRITY_SECRET: z.string().default(""),
  WOMPI_EVENTS_SECRET: z.string().default(""),
  STUCK_PENDING_AFTER_MS: z.coerce.number().int().positive().default(120_000),
  ORPHAN_PENDING_TTL_MS: z.coerce.number().int().positive().default(1_800_000),
  JOB_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
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

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

const WORKER_ENV_KEYS = [
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "NODE_ENV",
  "WOMPI_BASE_URL",
  "WOMPI_PUBLIC_KEY",
  "WOMPI_PRIVATE_KEY",
  "WOMPI_INTEGRITY_SECRET",
  "WOMPI_EVENTS_SECRET",
  "STUCK_PENDING_AFTER_MS",
  "ORPHAN_PENDING_TTL_MS",
  "JOB_INTERVAL_MS",
  "WEBHOOK_MAX_SKEW_SECONDS",
] as const;

export function loadEnvironment(): void {
  const workerEnv = resolve(process.cwd(), ".env");
  const rootEnv = resolve(process.cwd(), "../../.env");
  if (existsSync(workerEnv)) {
    loadDotenv({ path: workerEnv });
    return;
  }
  if (existsSync(rootEnv)) {
    loadDotenv({ path: rootEnv });
    // Root `.env` is shared with the API (`PORT=3000`). Never inherit that for
    // the worker — keep schema default 3001 unless WORKER_PORT is set.
    delete process.env.PORT;
  }
}

function present(source: NodeJS.ProcessEnv): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of WORKER_ENV_KEYS) {
    if (key === "PORT") {
      const workerPort = source.WORKER_PORT;
      if (workerPort !== undefined && workerPort.trim() !== "") {
        values.PORT = workerPort;
        continue;
      }
    }
    const value = source[key];
    if (value !== undefined && value.trim() !== "") {
      values[key] = value;
    }
  }
  return values;
}

export function parseWorkerEnv(
  source: NodeJS.ProcessEnv = process.env,
): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(present(source));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid worker environment:\n${details}`);
  }
  const data = parsed.data;
  if (data.NODE_ENV !== "production" && data.WOMPI_BASE_URL.trim().length === 0) {
    return { ...data, WOMPI_BASE_URL: "https://sandbox.wompi.co/v1" };
  }
  return data;
}

loadEnvironment();

export const env = parseWorkerEnv();
