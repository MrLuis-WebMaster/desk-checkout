export function createAbortScope() {
  let current: AbortController | null = null;

  return {
    start(): AbortController {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      return controller;
    },
    dispose(): void {
      current?.abort();
      current = null;
    },
  };
}
