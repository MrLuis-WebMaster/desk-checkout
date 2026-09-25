/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/modules/**/application/**/*.ts",
    "src/modules/**/domain/**/*.ts",
    "src/modules/**/presentation/controllers/**/*.ts",
    "src/modules/**/presentation/mappers/**/*.ts",
    "src/modules/**/presentation/idempotency-key.ts",
    "src/modules/**/infrastructure/**/*.ts",
    "src/shared/**/*.ts",
    "src/config/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.module.ts",
    "!src/**/*.orm-entity.ts",
    "!src/**/dto/**/*.ts",
    "!src/shared/infrastructure/persistence/migrations/**",
    "!src/shared/infrastructure/persistence/typeorm.data-source.ts",
    "!src/shared/infrastructure/persistence/seed.ts",
    "!src/shared/presentation/swagger/setup-swagger.ts",
    "!src/modules/catalog/infrastructure/typeorm/typeorm-product-reader.ts",
    "!src/modules/**/infrastructure/wompi/wompi-http-payment-gateway.ts",
    "!src/modules/**/infrastructure/nest-settlement-logger.ts",
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
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
    },
  },
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
    "^#shared/(.*)\\.js$": "<rootDir>/src/shared/$1",
    "^#modules/(.*)\\.js$": "<rootDir>/src/modules/$1",
    "^#config/(.*)\\.js$": "<rootDir>/src/config/$1",
  },
};
