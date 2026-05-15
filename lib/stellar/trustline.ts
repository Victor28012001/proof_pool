import { NextResponse } from "next/server";
import { getBountyBundle, setBountyEscrow, updateBountyStatus, ensureSchema } from "@/lib/store";
import { Horizon } from "@stellar/stellar-sdk";

async function hasTrustline(address: string): Promise<boolean> {
  try {
    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
    const account = await server.loadAccount(address);
    const usdcBalance = account.balances.find(
      (b: any) => b.asset_code === "USDC" && 
        b.asset_issuer === "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
    );
    return !!usdcBalance;
  } catch {
    return false;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id: bountyId } = await params;
  
  console.log("Funding bounty:", bountyId);
  
  try {
    const { funder_address } = await request.json();
    const bundle = await getBountyBundle(bountyId);
    
    if (!bundle) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    const prizeAmount = bundle.bounty.total_prize_pool;
    const isConfigured = process.env.TW_API_KEY && 
                         process.env.TW_API_KEY !== "your_api_key_here" &&
                         process.env.TW_API_BASE;
    
    if (isConfigured) {
      // Check trustline first
      const hasTrust = await hasTrustline(funder_address);
      if (!hasTrust) {
        return NextResponse.json({ 
          error: "Your wallet does not have a USDC trustline. Please add USDC asset to your wallet first." 
        }, { status: 400 });
      }
      
      try {
        const { deployBountyEscrow, fundEscrow } = await import("@/lib/tw/client");
        const { escrowId: realEscrowId } = await deployBountyEscrow(
          bountyId, prizeAmount, funder_address
        );
        await setBountyEscrow(bountyId, realEscrowId);
        await fundEscrow(realEscrowId, prizeAmount, funder_address);
        console.log("Real escrow deployed:", realEscrowId);
      } catch (err: any) {
        // If trustline is the issue, return error instead of mock
        if (err.message?.includes("trustline")) {
          return NextResponse.json({ 
            error: "Trustline issue: Please ensure your wallet has a USDC trustline on Stellar testnet." 
          }, { status: 400 });
        }
        console.error("Escrow deployment failed:", err);
        return NextResponse.json({ 
          error: `Escrow deployment failed: ${err.message}` 
        }, { status: 500 });
      }
    } else {
      // Only use mock if not configured
      const mockEscrowId = `escrow_${bountyId.slice(0, 8)}`;
      await setBountyEscrow(bountyId, mockEscrowId);
      console.log("Mock escrow created:", mockEscrowId);
    }
    
    await updateBountyStatus(bountyId, "registration_open");
    const updatedBundle = await getBountyBundle(bountyId);
    return NextResponse.json(updatedBundle);
  } catch (err: unknown) {
    console.error("Fund error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}