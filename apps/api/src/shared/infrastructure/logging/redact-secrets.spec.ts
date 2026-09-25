import {
  redactSecrets,
  safeErrorMessage,
  safeErrorStack,
} from "./redact-secrets.js";

describe("redactSecrets", () => {
  const previous = {
    WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY,
    WOMPI_INTEGRITY_SECRET: process.env.WOMPI_INTEGRITY_SECRET,
    WOMPI_EVENTS_SECRET: process.env.WOMPI_EVENTS_SECRET,
  };

  beforeEach(() => {
    process.env.WOMPI_PRIVATE_KEY = "prv_test_secret_value_abc";
    process.env.WOMPI_INTEGRITY_SECRET = "integrity_secret_value_xyz";
    process.env.WOMPI_EVENTS_SECRET = "events_secret_value_123";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("redacts Authorization (any scheme) and known env secret values", () => {
    const bearer =
      'Authorization: Bearer prv_test_secret_value_abc failed; WOMPI_INTEGRITY_SECRET=integrity_secret_value_xyz';
    const bearerRedacted = redactSecrets(bearer);
    expect(bearerRedacted).not.toContain("prv_test_secret_value_abc");
    expect(bearerRedacted).not.toContain("integrity_secret_value_xyz");
    expect(bearerRedacted).toContain("Authorization: [REDACTED]");
    expect(bearerRedacted).toMatch(/WOMPI_INTEGRITY_SECRET=\[REDACTED/);

    const basic = "Authorization: Basic dXNlcjpwYXNz boom";
    const basicRedacted = redactSecrets(basic);
    expect(basicRedacted).not.toContain("dXNlcjpwYXNz");
    expect(basicRedacted).toContain("Authorization: [REDACTED]");
  });

  it("safeError helpers never stringify secrets into log text", () => {
    const error = new Error(
      "fetch failed Authorization: Bearer prv_test_secret_value_abc",
    );
    error.stack = `Error: Authorization Bearer prv_test_secret_value_abc\n    at gateway`;
    expect(safeErrorMessage(error)).not.toContain("prv_test_secret_value_abc");
    expect(safeErrorStack(error)).not.toContain("prv_test_secret_value_abc");
  });
});
