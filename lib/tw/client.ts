import { Keypair, TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import crypto from "crypto";

const TW_API_BASE = (process.env.TW_API_BASE || "").replace(/\/$/, "");
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
      return Keypair.fromSecret(secret);
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
  body?: unknown,
  retries = 3
): Promise<T> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  const url = `${TW_API_BASE}${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`TW Request (attempt ${attempt}/${retries}): ${method} ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": TW_API_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        console.error(`TW API error (${res.status}):`, text);

        if (res.status === 400) {
          throw new Error(`TW API error: ${text}`);
        }

        if (attempt < retries) {
          const delay = attempt * 2000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        throw new Error(`TW API error: ${text}`);
      }

      return res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`Request timeout (attempt ${attempt}/${retries})`);
        if (attempt < retries) {
          const delay = attempt * 2000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Request timed out after ${retries} attempts`);
      }

      if (err.message?.includes('fetch failed') && attempt < retries) {
        const delay = attempt * 2000;
        console.log(`Network error, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw new Error(`Failed after ${retries} attempts`);
}

function signAndEncodeXdr(unsignedXdr: string, keypair: Keypair): string {
  console.log("Signing with public key:", keypair.publicKey());
  
  // Use TransactionBuilder.fromXDR for proper parsing
  const tx = TransactionBuilder.fromXDR(unsignedXdr, STELLAR_NETWORK) as any;
  
  // Sign the transaction
  tx.sign(keypair);
  
  const signedXdr = tx.toEnvelope().toXDR("base64");
  console.log("Signed XDR length:", signedXdr.length);
  return signedXdr;
}

async function buildSignSubmit(
  path: string,
  body: unknown,
  signerKeypair: Keypair
): Promise<{ txHash: string; contractId?: string }> {
  const buildRes = await twRequest<{ 
    unsignedTransaction?: string; 
    contractId?: string; 
    engagementId?: string;
    status?: string;
  }>("POST", path, body);

  if (!buildRes.unsignedTransaction) {
    throw new Error(`No unsigned transaction in response from ${path}`);
  }

  console.log("Unsigned XDR received, length:", buildRes.unsignedTransaction.length);

  const signedXdr = signAndEncodeXdr(buildRes.unsignedTransaction, signerKeypair);
  
  console.log("Signed XDR, length:", signedXdr.length);

  const submitRes = await twRequest<{ status: string; message?: string; details?: any }>(
    "POST", "/helper/send-transaction", { signedXdr }
  );

  console.log("Submit response status:", submitRes.status);

  if (submitRes.status !== "SUCCESS") {
    console.error("Submit failed:", JSON.stringify(submitRes));
    throw new Error(`Transaction submission failed: ${submitRes.message || JSON.stringify(submitRes)}`);
  }

  const txHash = crypto.createHash("sha256").update(signedXdr).digest("hex");
  return { txHash, contractId: buildRes.contractId };
}

export async function deployBountyEscrow(
  bountyId: string,
  prizePool: string,
  creatorAddress: string
): Promise<{ escrowId: string; deployTxHash: string }> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  const platformPub = getPlatformPublicKey();
  const platformKp = getPlatformKeypair();
  const resolverPub = getResolverPublicKey();

  console.log("Deploying escrow for bounty:", bountyId, "amount:", prizePool);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Deploy attempt ${attempt}/3...`);
      
      const buildRes = await twRequest<{ 
        status: string;
        unsignedTransaction?: string;
        contractId?: string;
      }>(
        "POST",
        "/deployer/single-release",
        {
          signer: platformPub,  // PLATFORM signs, not creator
          engagementId: `${bountyId}-${Date.now()}`,
          title: `Bounty: ${bountyId.slice(0, 8)}`,
          description: "Trust-minimized competition escrow",
          amount: Number(prizePool),
          platformFee: 5,
          milestones: [{ 
            description: "Competition completed - winner selected" 
          }],
          roles: {
            approver: platformPub,
            serviceProvider: platformPub,
            platformAddress: platformPub,
            releaseSigner: platformPub,
            disputeResolver: resolverPub,
            receiver: platformPub
          },
          trustline: {
            symbol: "USDC",
            address: USDC_TESTNET_ISSUER
          }
        }
      );

      if (!buildRes.unsignedTransaction) {
        throw new Error("No unsigned transaction returned");
      }

      // Sign with PLATFORM keypair since we set platform as signer
      const signedXdr = signAndEncodeXdr(buildRes.unsignedTransaction, platformKp);
      
      const submitRes = await twRequest<{ 
        status: string; 
        message?: string; 
        contractId?: string;
      }>(
        "POST",
        "/helper/send-transaction",
        { signedXdr }
      );

      if (submitRes.status === "SUCCESS") {
        const txHash = crypto.createHash("sha256").update(signedXdr).digest("hex");
        const contractId = buildRes.contractId || submitRes.contractId || `escrow_${bountyId.slice(0, 8)}`;
        console.log("Escrow deployed! Contract:", contractId);
        return { escrowId: contractId, deployTxHash: txHash };
      }

      console.warn(`Attempt ${attempt} failed:`, submitRes.message);
      
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err: any) {
      console.warn(`Attempt ${attempt} error:`, err.message);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw err;
      }
    }
  }

  throw new Error("Failed to deploy escrow after 3 attempts");
}

export async function fundEscrow(
  escrowId: string,
  amount: string,
  signerAddress: string
): Promise<{ fundTxHash: string }> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  console.log("Funding escrow:", escrowId, "amount:", amount, "signer:", signerAddress);

  // Step 1: Build the funding transaction
  const buildRes = await twRequest<{ 
    status: string;
    unsignedTransaction?: string;
  }>(
    "POST", 
    "/escrow/single-release/fund-escrow",
    {
      contractId: escrowId,
      signer: signerAddress,
      amount: Number(amount)
    }
  );

  if (!buildRes.unsignedTransaction) {
    throw new Error("No unsigned transaction returned from fund-escrow");
  }

  console.log("Fund unsigned XDR length:", buildRes.unsignedTransaction.length);

  // Step 2: Sign with platform keypair
  const platformKp = getPlatformKeypair();
  const signedXdr = signAndEncodeXdr(buildRes.unsignedTransaction, platformKp);
  
  console.log("Fund signed XDR length:", signedXdr.length);

  // Step 3: Submit to Stellar
  const submitRes = await twRequest<{ status: string; message?: string }>(
    "POST",
    "/helper/send-transaction",
    { signedXdr }
  );

// Log the full response for debugging
console.log("Submit response:", JSON.stringify(submitRes).substring(0, 500));

  if (submitRes.status !== "SUCCESS") {
    throw new Error(`Fund transaction failed: ${submitRes.message || JSON.stringify(submitRes)}`);
  }

  const txHash = crypto.createHash("sha256").update(signedXdr).digest("hex");
  return { fundTxHash: txHash };
}

export async function releaseFunds(escrowId: string): Promise<{ txHash: string }> {
  if (!isConfigured()) throw new Error("Trustless Work not configured");

  const platformKp = getPlatformKeypair();
  const platformPub = platformKp.publicKey();

  // Step 1: Approve the milestone
  console.log("Approving milestone for:", escrowId);
  const approveRes = await twRequest<{ status: string; unsignedTransaction?: string }>(
    "POST",
    "/escrow/single-release/approve-milestone",
    {
      contractId: escrowId,
      milestoneIndex: "0",
      approver: platformPub
    }
  );

  if (approveRes.unsignedTransaction) {
    const signedApproveXdr = signAndEncodeXdr(approveRes.unsignedTransaction, platformKp);
    await twRequest("POST", "/helper/send-transaction", { signedXdr: signedApproveXdr });
  }

  // Step 2: Release the funds
  console.log("Releasing funds for:", escrowId);
  const releaseRes = await twRequest<{ status: string; unsignedTransaction?: string }>(
    "POST",
    "/escrow/single-release/release-funds",
    {
      contractId: escrowId,
      releaseSigner: platformPub
    }
  );

  if (!releaseRes.unsignedTransaction) {
    throw new Error("No unsigned transaction for release");
  }

  const signedReleaseXdr = signAndEncodeXdr(releaseRes.unsignedTransaction, platformKp);
  
  const submitRes = await twRequest<{ status: string }>(
    "POST",
    "/helper/send-transaction",
    { signedXdr: signedReleaseXdr }
  );

  if (submitRes.status !== "SUCCESS") {
    throw new Error("Release transaction failed");
  }

  const txHash = crypto.createHash("sha256").update(signedReleaseXdr).digest("hex");
  return { txHash };
}

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