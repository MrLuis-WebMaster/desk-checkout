/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  passWithNoTests: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.orm-entity.ts",
    "!src/index.ts",
    "!src/**/*.spec.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "\\.spec\\.ts$",
    "\\.test\\.ts$",
    "main\\.ts$",
    "\\.module\\.ts$",
    "\\.orm-entity\\.ts$",
    "/migrations/",
    "data-source\\.ts$",
    "index\\.ts$",
  ],
  coverageReporters: ["text", "text-summary"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2022",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?@checkout/)",
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
