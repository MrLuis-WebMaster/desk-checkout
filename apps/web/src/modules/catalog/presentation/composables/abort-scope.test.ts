import { describe, expect, it, vi } from "vitest";
import { createAbortScope } from "./abort-scope";

describe("createAbortScope", () => {
  it("aborts the previous controller when starting a new request", () => {
    const scope = createAbortScope();
    const first = scope.start();
    const firstAbort = vi.spyOn(first, "abort");

    const second = scope.start();
    expect(firstAbort).toHaveBeenCalledOnce();
    expect(second.signal.aborted).toBe(false);

    scope.dispose();
    expect(second.signal.aborted).toBe(true);
  });
});
