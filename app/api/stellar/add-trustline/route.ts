import { NextResponse } from "next/server";
import { Keypair, TransactionBuilder, Operation, Asset, Networks, Horizon } from "@stellar/stellar-sdk";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
    const horizonUrl = "https://horizon-testnet.stellar.org";
    const server = new Horizon.Server(horizonUrl);

    // First, fund the account with test XLM if it has no balance
    try {
      await server.loadAccount(address);
    } catch {
      // Account doesn't exist yet - fund it with friendbot
      await fetch(`https://friendbot.stellar.org?addr=${address}`);
      // Wait a moment for the account to be created
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Now add the trustline using the platform wallet
    const platformSecret = process.env.PLATFORM_STELLAR_SECRET;
    if (!platformSecret) {
      return NextResponse.json({ 
        error: "Platform wallet not configured",
        manualInstructions: "Please add USDC asset manually in your wallet: issuer GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
      }, { status: 500 });
    }

    const platformKeypair = Keypair.fromSecret(platformSecret);
    const account = await server.loadAccount(address);

    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({
        asset: new Asset("USDC", usdcIssuer),
        source: address,
      }))
      .setTimeout(30)
      .build();

    // The transaction needs to be signed by the account owner (the user)
    // We return the XDR for them to sign, OR we have the platform sign if it's the same
    const xdr = transaction.toXDR();
    
    return NextResponse.json({ 
      success: true, 
      message: "Trustline transaction created",
      xdr: xdr,
      instructions: "Sign this transaction in your wallet to add the USDC trustline"
    });
  } catch (err: unknown) {
    console.error("Trustline error:", err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : String(err),
      manualInstructions: "Add USDC asset manually in your wallet. Issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
    }, { status: 500 });
  }
}