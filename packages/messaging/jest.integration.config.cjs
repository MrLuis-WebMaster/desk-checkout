/** @type {import('jest').Config} */
module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["**/*.integration.spec.ts"],
  testPathIgnorePatterns: [],
  coverageThreshold: undefined,
};
