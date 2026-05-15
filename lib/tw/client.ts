import { Keypair, Transaction, Networks } from "@stellar/stellar-sdk";
import crypto from "crypto";

const TW_API_BASE = (process.env.TW_API_BASE || "").replace(/\/$/, ""); // Remove trailing slash
const TW_API_KEY = process.env.TW_API_KEY ?? "";

const STELLAR_NETWORK = process.env.STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
const USDC_TESTNET_ISSUER = process.env.USDC_STELLAR_ISSUER || "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function getPlatformKeypair(): Keypair {
  const secret = process.env.PLATFORM_STELLAR_SECRET;
  if (secret) {
    try {
      if (!secret.startsWith('S')) {
        throw new Error("PLATFORM_STELLAR_SECRET must start with 'S'");
      }
      const kp = Keypair.fromSecret(secret);
      const expectedPub = process.env.PLATFORM_STELLAR_PUBLIC_KEY;
      if (expectedPub && kp.publicKey() !== expectedPub) {
        console.error("KEY MISMATCH! Secret key doesn't match public key");
        console.error("Secret generates:", kp.publicKey());
        console.error("Expected:", expectedPub);
      }
      return kp;
    } catch (err) {
      console.error("Invalid PLATFORM_STELLAR_SECRET:", err);
      throw new Error("Invalid Stellar secret key.");
    }
  }
  console.warn("No PLATFORM_STELLAR_SECRET set - using mock mode");
  return Keypair.random();
}

function getResolverKeypair(): Keypair {
  const platformSecret = process.env.PLATFORM_STELLAR_SECRET;
  if (!platformSecret) throw new Error("PLATFORM_STELLAR_SECRET missing");
  const hash = crypto.createHash('sha256').update(platformSecret + "resolver").digest();
  return Keypair.fromRawEd25519Seed(hash);
}

export function getPlatformPublicKey(): string {
  const pub = process.env.PLATFORM_STELLAR_PUBLIC_KEY;
  if (pub) return pub;
  const secret = process.env.PLATFORM_STELLAR_SECRET;
  if (secret) return Keypair.fromSecret(secret).publicKey();
  return "G" + "X".repeat(55);
}

export function getResolverPublicKey(): string {
  return getResolverKeypair().publicKey();
}

function isConfigured(): boolean {
  return Boolean(TW_API_BASE && TW_API_KEY && TW_API_KEY !== "your_api_key_here");
}

async function twRequest<T = Record<string, unknown>>(
  method: "POST" | "PUT" | "GET",
  path: string,
  body?: unknown
): Promise<T> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  const url = `${TW_API_BASE}${path}`;
  console.log(`TW Request: ${method} ${url}`, body ? JSON.stringify(body).substring(0, 200) : '');

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TW_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`TW API error (${res.status}):`, text);
    throw new Error(`TW API error: ${text}`);
  }

  return res.json();
}

function signAndEncodeXdr(unsignedXdr: string, keypair: Keypair): string {
  const tx = new Transaction(unsignedXdr, STELLAR_NETWORK);
  tx.sign(keypair);
  return tx.toEnvelope().toXDR("base64");
}

async function buildSignSubmit(
  path: string,
  body: unknown,
  signerKeypair: Keypair
): Promise<{ txHash: string; contractId?: string }> {
  const buildRes = await twRequest<{ unsignedTransaction?: string; contractId?: string; engagementId?: string }>(
    "POST", path, body
  );

  if (!buildRes.unsignedTransaction) {
    throw new Error(`No unsigned transaction in response from ${path}`);
  }

  const signedXdr = signAndEncodeXdr(buildRes.unsignedTransaction, signerKeypair);

  const submitRes = await twRequest<{ status: string; message?: string }>(
    "POST", "/helper/send-transaction", { signedXdr }
  );

  if (submitRes.status !== "SUCCESS") {
    throw new Error(`Transaction submission failed: ${submitRes.message || submitRes.status}`);
  }

  const txHash = crypto.createHash("sha256").update(signedXdr).digest("hex");
  return { txHash, contractId: buildRes.contractId };
}

// Deploy escrow - using the correct API path
export async function deployBountyEscrow(
  bountyId: string,
  prizePool: string,
  creatorAddress: string
): Promise<{ escrowId: string; deployTxHash: string }> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  const platformPub = getPlatformPublicKey();
  
  console.log("Deploying escrow for bounty:", bountyId, "amount:", prizePool);
  console.log("Platform wallet:", platformPub);
  console.log("Creator wallet:", creatorAddress);

  const result = await buildSignSubmit(
    "/deployer/single-release",
    {
      signer: creatorAddress,
      engagementId: bountyId,
      title: `Bounty: ${bountyId.slice(0, 8)}`,
      description: "Trust-minimized competition escrow",
      amount: Number(prizePool),
      platformFee: 5,
      milestones: [{ description: "Competition completed - winner selected" }],
      roles: {
        approver: platformPub,
        serviceProvider: platformPub,     // Platform provides the service
        platformAddress: platformPub,
        releaseSigner: platformPub,
        disputeResolver: getResolverPublicKey(),
        receiver: platformPub             // Platform receives funds first, then distributes
      },
      trustline: {
        symbol: "USDC",
        address: USDC_TESTNET_ISSUER
      }
    },
    getPlatformKeypair()
  );

  return {
    escrowId: result.contractId || `escrow_${bountyId.slice(0, 8)}`,
    deployTxHash: result.txHash
  };
}

// Fund escrow
export async function fundEscrow(
  escrowId: string,
  amount: string,
  funderAddress: string
): Promise<{ fundTxHash: string }> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  const result = await buildSignSubmit(
    "/escrow/single-release/fund-escrow",
    {
      contractId: escrowId,
      amount: Number(amount),
      signer: funderAddress
    },
    getPlatformKeypair()
  );

  return { fundTxHash: result.txHash };
}

// Release funds to winner
export async function releaseFunds(escrowId: string): Promise<{ txHash: string }> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  const platformKp = getPlatformKeypair();

  // Approve milestone
  await buildSignSubmit(
    "/escrow/single-release/approve-milestone",
    {
      contractId: escrowId,
      milestoneIndex: "0",
      approver: platformKp.publicKey()
    },
    platformKp
  );

  // Release funds
  return buildSignSubmit(
    "/escrow/single-release/release-funds",
    {
      contractId: escrowId,
      releaseSigner: platformKp.publicKey()
    },
    platformKp
  );
}

// Dispute handling
export async function disputeEscrow(escrowId: string): Promise<{ txHash: string }> {
  const platformKp = getPlatformKeypair();
  return buildSignSubmit(
    "/escrow/single-release/dispute-escrow",
    { contractId: escrowId, signer: platformKp.publicKey() },
    platformKp
  );
}

export async function resolveDispute(
  escrowId: string,
  distributions: Array<[string, number]>
): Promise<{ txHash: string }> {
  const resolverKp = getResolverKeypair();
  return buildSignSubmit(
    "/escrow/single-release/resolve-dispute",
    {
      contractId: escrowId,
      disputeResolver: resolverKp.publicKey(),
      distributions: distributions.map(([address, amount]) => ({ address, amount }))
    },
    resolverKp
  );
}