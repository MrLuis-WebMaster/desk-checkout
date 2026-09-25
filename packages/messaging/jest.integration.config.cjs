/** @type {import('jest').Config} */
module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["**/*.integration.spec.ts"],
  testPathIgnorePatterns: [],
  coverageThreshold: undefined,
  // amqplib sockets / timers can keep the event loop alive after assertions.
  forceExit: true,
  testTimeout: 20_000,
};
