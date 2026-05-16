import { NextResponse } from "next/server";
import { getBountyBundle, setBountyEscrow, updateBountyStatus, ensureSchema } from "@/lib/store";
import { deployBountyEscrow, getPlatformPublicKey } from "@/lib/tw/client";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id: bountyId } = await params;
  
  console.log("Funding bounty:", bountyId);
  
  try {
    const { funder_address, signedXdr: fundSignedXdr } = await request.json();
    const bundle = await getBountyBundle(bountyId);
    
    if (!bundle) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    const prizeAmount = bundle.bounty.total_prize_pool;
    const twBase = process.env.TW_API_BASE || "";
    const twKey = process.env.TW_API_KEY || "";

    if (!twBase || !twKey) {
      // Mock mode
      const mockEscrowId = `escrow_${bountyId.slice(0, 8)}`;
      await setBountyEscrow(bountyId, mockEscrowId);
      await updateBountyStatus(bountyId, "registration_open");
      return NextResponse.json(await getBountyBundle(bountyId));
    }

    // Step 1: Deploy escrow if not already deployed
    let escrowId = bundle.bounty.escrow_id;
    if (!escrowId) {
      console.log("Deploying escrow...");
      const { escrowId: newEscrowId } = await deployBountyEscrow(
        bountyId, prizeAmount, funder_address
      );
      escrowId = newEscrowId;
      await setBountyEscrow(bountyId, escrowId);
      console.log("Escrow deployed:", escrowId);
    }

    // Step 2: Handle funding
    if (fundSignedXdr) {
      // Creator already signed — submit the signed XDR
      const submitRes = await fetch(`${twBase}/helper/send-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": twKey,
        },
        body: JSON.stringify({ signedXdr: fundSignedXdr }),
      });
      const submitData = await submitRes.json();
      
      if (submitData.status !== "SUCCESS") {
        console.error("Fund submit failed:", submitData);
        throw new Error("Fund transaction failed: " + JSON.stringify(submitData));
      }
      
      console.log("Escrow funded successfully!");
      await updateBountyStatus(bountyId, "registration_open");
      return NextResponse.json(await getBountyBundle(bountyId));
    }

    // Build the fund transaction for creator to sign
    const fundBuildRes = await fetch(`${twBase}/escrow/single-release/fund-escrow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": twKey,
      },
      body: JSON.stringify({
        contractId: escrowId,
        signer: funder_address,
        amount: Number(prizeAmount)
      }),
    });
    const fundBuildData = await fundBuildRes.json();
    
    if (!fundBuildData.unsignedTransaction) {
      throw new Error("Failed to build fund transaction: " + JSON.stringify(fundBuildData));
    }

    console.log("Returning unsigned fund XDR for creator to sign");
    
    return NextResponse.json({
      needsSignature: true,
      escrowId: escrowId,
      unsignedTransaction: fundBuildData.unsignedTransaction,
      message: "Please sign the fund transaction with your wallet"
    });

  } catch (err: unknown) {
    console.error("Fund error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}