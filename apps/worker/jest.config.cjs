/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  setupFiles: ["<rootDir>/jest.setup.cjs"],
  collectCoverageFrom: [
    "src/modules/**/application/**/*.ts",
    "src/modules/**/presentation/**/*.ts",
    "src/modules/settlement/infrastructure/**/*.ts",
    "src/config/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.module.ts",
    "!src/main.ts",
    "!src/modules/settlement/infrastructure/wompi/wompi-http-payment-gateway.ts",
    "!src/modules/reconciliation/presentation/reconciliation.scheduler.ts",
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
    "/node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(@nestjs|@checkout)/)",
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
