/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  testPathIgnorePatterns: ["\\.integration\\.spec\\.ts$"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.integration.spec.ts",
    "!src/index.ts",
    "!src/connection-manager.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "\\.spec\\.ts$",
    "\\.integration\\.spec\\.ts$",
    "index\\.ts$",
    "connection-manager\\.ts$",
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
          parser: { syntax: "typescript" },
          target: "es2022",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
