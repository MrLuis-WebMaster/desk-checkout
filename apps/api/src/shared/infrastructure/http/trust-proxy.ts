/**
 * Resolves Express `trust proxy` from env.
 *
 * Defaults to **false** in every environment. Enabling trust proxy without a
 * real reverse proxy lets clients spoof `X-Forwarded-For` and bypass throttling.
 * Set `TRUST_PROXY=1` (or hop count) only when Coolify/nginx terminates TLS and
 * forwards `X-Forwarded-For`. Do not publish the API port directly with trust on.
 */
export function resolveTrustProxy(
  nodeEnv: string,
  trustProxyEnv: string | undefined,
): boolean | number {
  void nodeEnv;
  if (trustProxyEnv !== undefined && trustProxyEnv.trim() !== "") {
    const raw = trustProxyEnv.trim().toLowerCase();
    if (raw === "true" || raw === "1") {
      return 1;
    }
    if (raw === "false" || raw === "0") {
      return false;
    }
    const asNumber = Number(trustProxyEnv);
    if (Number.isFinite(asNumber) && asNumber >= 0) {
      return asNumber;
    }
  }
  return false;
}
