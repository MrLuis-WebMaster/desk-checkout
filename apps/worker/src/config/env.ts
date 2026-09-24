import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

export const workerEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function loadEnvironment(): void {
  const path = resolve(process.cwd(), ".env");
  if (existsSync(path)) {
    loadDotenv({ path });
  }
}

export function parseWorkerEnv(
  source: NodeJS.ProcessEnv = process.env,
): WorkerEnv {
  const port = source.PORT?.trim();
  const parsed = workerEnvSchema.safeParse(port ? { PORT: port } : {});
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid worker environment:\n${details}`);
  }
  return parsed.data;
}

loadEnvironment();

export const env = parseWorkerEnv();
