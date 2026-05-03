import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk";
import { arbSepolia } from "@cofhe/sdk/chains";
import type { PublicClient, WalletClient } from "viem";

let client: CofheClient | null = null;
let connectPromise: Promise<CofheClient> | null = null;
let connectedAccount: string | null = null;

// Intercept fetch to capture sealOutput response bodies
if (typeof window !== "undefined") {
  const _fetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
          ? args[0].href
          : (args[0] as Request)?.url;
    const resp = await _fetch(...args);
    if (url?.includes("sealoutput")) {
      const cloned = resp.clone();
      const body = await cloned.text();
      console.log(
        `[sealOutput intercept] ${resp.status} ${resp.statusText}`,
        body.slice(0, 1000),
      );
      if (args[1]?.body) {
        console.log("[sealOutput request body]", args[1].body);
      }
    }
    return resp;
  };
}

export async function getFheClient(
  publicClient: PublicClient,
  walletClient: WalletClient
): Promise<CofheClient> {
  // Reset if the connected account changed (user switched wallets)
  const currentAccount = walletClient.account?.address?.toLowerCase() ?? null;
  if (client && connectedAccount && currentAccount !== connectedAccount) {
    console.log("[fhe] Account changed from", connectedAccount, "to", currentAccount, "— resetting client");
    client = null;
    connectPromise = null;
    connectedAccount = null;
  }

  if (client) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const config = createCofheConfig({
      supportedChains: [arbSepolia],
    });
    const c = createCofheClient(config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await c.connect(publicClient as any, walletClient as any);
    client = c;
    connectedAccount = currentAccount;
    return c;
  })();

  return connectPromise;
}

export function resetFheClient() {
  client = null;
  connectPromise = null;
}

export async function encryptUint64(
  publicClient: PublicClient,
  walletClient: WalletClient,
  value: bigint,
  onStep?: (step: string) => void
) {
  const c = await getFheClient(publicClient, walletClient);
  onStep?.("Initializing FHE");
  const result = await c
    .encryptInputs([Encryptable.uint64(value)])
    .onStep((step: any) => onStep?.(String(step)))
    .execute();
  const item = result[0];
  return { ...item, signature: item.signature as `0x${string}` };
}

export async function decryptForView(
  publicClient: PublicClient,
  walletClient: WalletClient,
  ctHash: `0x${string}` | bigint,
  onStep?: (step: string) => void
) {
  const c = await getFheClient(publicClient, walletClient);
  const handle = typeof ctHash === "string" ? BigInt(ctHash) : ctHash;
  console.log("[fhe] decryptForView handle:", handle.toString(), "hex:", handle.toString(16).padStart(64, "0"));

  // Skip the network round-trip + wallet permit if we've already decrypted this handle for this wallet this session.
  const account = walletClient.account?.address?.toLowerCase() ?? "anon";
  const cacheKey = `kura.fhe.dec.${account}.${handle.toString(16)}`;
  if (typeof window !== "undefined") {
    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached !== null) {
        onStep?.("Complete (cached)");
        return BigInt(cached);
      }
    } catch {
      // sessionStorage may be unavailable (e.g. private mode); ignore
    }
  }

  // First attempt: use existing (cached) permit
  onStep?.("Creating permit");
  await c.permits.getOrCreateSelfPermit();
  onStep?.("Decrypting");
  try {
    const result = (await c.decryptForView(handle, FheTypes.Uint64).execute()) as bigint;
    if (typeof window !== "undefined") {
      try { window.sessionStorage.setItem(cacheKey, result.toString()); } catch { /* ignore */ }
    }
    onStep?.("Complete");
    return result;
  } catch (err: any) {
    console.error("[fhe] sealOutput attempt 1 failed:", err?.message);
    if (err?.context) console.error("[fhe] error context:", JSON.stringify(err.context, (_k: string, v: unknown) => typeof v === "bigint" ? v.toString() : v, 2));

    // Retry with a fresh permit — the cached one may be stale/corrupt
    console.log("[fhe] Retrying with fresh permit...");
    onStep?.("Refreshing permit");
    try {
      const chainId = await publicClient.getChainId();
      const acc = walletClient.account?.address;
      if (acc) {
        await c.permits.removeActivePermit(chainId, acc);
      }
      await c.permits.createSelf({ issuer: acc!, name: "Fresh self permit" });
      onStep?.("Decrypting (retry)");
      const result = (await c.decryptForView(handle, FheTypes.Uint64).execute()) as bigint;
      if (typeof window !== "undefined") {
        try { window.sessionStorage.setItem(cacheKey, result.toString()); } catch { /* ignore */ }
      }
      onStep?.("Complete");
      return result;
    } catch (retryErr: any) {
      console.error("[fhe] sealOutput attempt 2 failed:", retryErr?.message);
      if (retryErr?.context) console.error("[fhe] retry error context:", JSON.stringify(retryErr.context, (_k: string, v: unknown) => typeof v === "bigint" ? v.toString() : v, 2));
      throw retryErr;
    }
  }
}

export async function decryptForTx(
  publicClient: PublicClient,
  walletClient: WalletClient,
  ctHash: `0x${string}` | bigint,
  onStep?: (step: string) => void
) {
  const c = await getFheClient(publicClient, walletClient);
  onStep?.("Decrypting for TX");
  // CoFHE expects uint256 handle — convert hex string to BigInt
  const handle = typeof ctHash === "string" ? BigInt(ctHash) : ctHash;
  const result = await c.decryptForTx(handle).withoutPermit().execute();
  onStep?.("Complete");
  return result;
}
