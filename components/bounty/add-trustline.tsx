"use client";

import { useState } from "react";
import { T } from "./theme";
import { Card, Btn, MonoText } from "./ui";

export function AddTrustline({ clientPub, onConnectWallet }: {
  clientPub: string | null;
  onConnectWallet: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTrustline = async () => {
    if (!clientPub) {
      onConnectWallet();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stellar/add-trustline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: clientPub }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card pad={16} tint={T.amberSoft} style={{ borderColor: T.amber, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.amber, marginBottom: 8 }}>
        USDC Trustline Required
      </div>
      <div style={{ fontSize: 13, color: T.ink2, marginBottom: 12 }}>
        Your wallet needs to trust USDC on Stellar testnet before creating bounties.
      </div>
      
      {success && (
        <div style={{ 
          padding: '8px 12px', background: T.emeraldSoft, borderRadius: 8, 
          color: T.emerald, fontSize: 13, marginBottom: 12 
        }}>
          ✓ Trustline added successfully! You can now create bounties.
        </div>
      )}
      
      {error && (
        <div style={{ 
          padding: '8px 12px', background: T.redSoft, borderRadius: 8, 
          color: T.red, fontSize: 13, marginBottom: 12 
        }}>
          {error}
        </div>
      )}

      <Btn 
        tone="amber" 
        size="sm" 
        onClick={addTrustline} 
        disabled={loading}
      >
        {loading ? 'Adding Trustline...' : 'Add USDC Trustline'}
      </Btn>
      
      <div style={{ fontSize: 11, color: T.mute, marginTop: 8 }}>
        USDC Issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
      </div>
    </Card>
  );
}