import { NextResponse } from "next/server";
import { Keypair, TransactionBuilder, Operation, Asset, Networks, Horizon } from "@stellar/stellar-sdk";

export async function GET() {
  const platformSecret = process.env.PLATFORM_STELLAR_SECRET;
  const platformPublic = process.env.PLATFORM_STELLAR_PUBLIC_KEY;
  
  if (!platformSecret || !platformPublic) {
    return NextResponse.json({ error: "Platform wallet not configured in .env" }, { status: 500 });
  }

  const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const horizonUrl = "https://horizon-testnet.stellar.org";
  const server = new Horizon.Server(horizonUrl);

  try {
    // Check if platform account exists
    let account;
    try {
      account = await server.loadAccount(platformPublic);
    } catch {
      // Fund with friendbot
      const fbRes = await fetch(`https://friendbot.stellar.org?addr=${platformPublic}`);
      const fbData = await fbRes.json();
      console.log("Friendbot funded:", fbData);
      await new Promise(r => setTimeout(r, 3000));
      account = await server.loadAccount(platformPublic);
    }

    // Check for USDC trustline
    const hasUSDC = account.balances.some(
      (b: any) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer
    );

    if (!hasUSDC) {
      const kp = Keypair.fromSecret(platformSecret);
      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.changeTrust({
          asset: new Asset("USDC", usdcIssuer),
        }))
        .setTimeout(30)
        .build();
      
      tx.sign(kp);
      const result = await server.submitTransaction(tx);
      return NextResponse.json({ 
        success: true, 
        message: "Platform wallet configured with USDC trustline",
        txHash: result.hash 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Platform wallet already configured" 
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}