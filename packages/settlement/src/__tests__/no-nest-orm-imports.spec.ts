import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(__dirname, "..");
const FORBIDDEN = [
  /from\s+['"]@nestjs\//,
  /from\s+['"]typeorm['"]/,
  /from\s+['"]typeorm\//,
  /from\s+['"]pg['"]/,
  /require\(\s*['"]@nestjs\//,
  /require\(\s*['"]typeorm['"]/,
  /require\(\s*['"]pg['"]/,
  /process\.env/,
  /23505/,
  /mapWompiStatus/,
];

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(full));
      continue;
    }
    if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("packages/settlement hexagonal guard", () => {
  it("does not import Nest, TypeORM, or pg", () => {
    const files = collectTsFiles(SRC_ROOT);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(content)) {
          violations.push(
            `${relative(SRC_ROOT, file)} matches ${pattern}`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
