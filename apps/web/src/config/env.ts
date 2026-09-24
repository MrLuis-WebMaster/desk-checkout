import { z } from "zod";

export const webEnvSchema = z.object({
  VITE_API_URL: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.replace(/\/$/, ""))
    .pipe(z.url({ protocol: /^https?$/ })),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseWebEnv(source: { VITE_API_URL?: string }): WebEnv {
  const parsed = webEnvSchema.safeParse({
    VITE_API_URL: source.VITE_API_URL,
  });
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid web environment:\n${details}`);
  }
  return parsed.data;
}

export const env = parseWebEnv({
  VITE_API_URL: import.meta.env.VITE_API_URL,
});
