import type { CofheClient } from "@cofhe/sdk";
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
    const { createCofheClient, createCofheConfig } = await import("@cofhe/sdk/web");
    const { arbSepolia } = await import("@cofhe/sdk/chains");
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
  const { Encryptable } = await import("@cofhe/sdk");
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
  const { FheTypes } = await import("@cofhe/sdk");
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

// ─── Wave 4: Additional encrypt helpers ──────────────────────────────────────

export async function encryptUint8(
  publicClient: PublicClient,
  walletClient: WalletClient,
  value: number,
  onStep?: (step: string) => void
) {
  const c = await getFheClient(publicClient, walletClient);
  const { Encryptable } = await import("@cofhe/sdk");
  onStep?.("Initializing FHE");
  const result = await c
    .encryptInputs([Encryptable.uint8(value)])
    .onStep((step: any) => onStep?.(String(step)))
    .execute();
  const item = result[0];
  return { ...item, signature: item.signature as `0x${string}` };
}

export async function encryptBool(
  publicClient: PublicClient,
  walletClient: WalletClient,
  value: boolean,
  onStep?: (step: string) => void
) {
  const c = await getFheClient(publicClient, walletClient);
  const { Encryptable } = await import("@cofhe/sdk");
  onStep?.("Initializing FHE");
  const result = await c
    .encryptInputs([Encryptable.bool(value)])
    .onStep((step: any) => onStep?.(String(step)))
    .execute();
  const item = result[0];
  return { ...item, signature: item.signature as `0x${string}` };
}

export async function encryptAddress(
  publicClient: PublicClient,
  walletClient: WalletClient,
  address: `0x${string}`,
  onStep?: (step: string) => void
) {
  const c = await getFheClient(publicClient, walletClient);
  const { Encryptable } = await import("@cofhe/sdk");
  onStep?.("Initializing FHE");
  const result = await c
    .encryptInputs([Encryptable.address(address)])
    .onStep((step: any) => onStep?.(String(step)))
    .execute();
  const item = result[0];
  return { ...item, signature: item.signature as `0x${string}` };
}

export async function decryptForView_uint8(
  publicClient: PublicClient,
  walletClient: WalletClient,
  ctHash: `0x${string}` | bigint,
  onStep?: (step: string) => void
): Promise<number> {
  const c = await getFheClient(publicClient, walletClient);
  const { FheTypes } = await import("@cofhe/sdk");
  const handle = typeof ctHash === "string" ? BigInt(ctHash) : ctHash;
  onStep?.("Creating permit");
  await c.permits.getOrCreateSelfPermit();
  onStep?.("Decrypting");
  const result = (await c.decryptForView(handle, FheTypes.Uint8).execute()) as bigint;
  onStep?.("Complete");
  return Number(result);
}

export async function batchDecryptForView(
  publicClient: PublicClient,
  walletClient: WalletClient,
  handles: Array<{ ctHash: `0x${string}` | bigint; type: "uint64" | "uint8" | "bool" }>,
  onStep?: (step: string) => void
): Promise<bigint[]> {
  const c = await getFheClient(publicClient, walletClient);
  const { FheTypes } = await import("@cofhe/sdk");
  onStep?.("Creating permit");
  await c.permits.getOrCreateSelfPermit();
  onStep?.("Decrypting batch");

  const results: bigint[] = [];
  for (const { ctHash, type } of handles) {
    const handle = typeof ctHash === "string" ? BigInt(ctHash) : ctHash;
    const fheType =
      type === "uint8" ? FheTypes.Uint8 : type === "bool" ? FheTypes.Bool : FheTypes.Uint64;
    const r = (await c.decryptForView(handle, fheType).execute()) as bigint;
    results.push(r);
  }

  onStep?.("Complete");
  return results;
}
