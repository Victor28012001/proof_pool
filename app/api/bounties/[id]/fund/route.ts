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
      // Real escrow mode - don't fall back to mock
      try {
        const { deployBountyEscrow, fundEscrow } = await import("@/lib/tw/client");
        const { escrowId } = await deployBountyEscrow(
          bountyId, prizeAmount, funder_address
        );
        await setBountyEscrow(bountyId, escrowId);
        await fundEscrow(escrowId, prizeAmount, funder_address);
        console.log("Real escrow deployed:", escrowId);
      } catch (err: any) {
        console.error("Escrow deployment failed:", err.message);
        // Return the actual error - no mock fallback
        return NextResponse.json({ 
          error: err.message || "Escrow deployment failed" 
        }, { status: 500 });
      }
    } else {
      // Mock mode only when NOT configured
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