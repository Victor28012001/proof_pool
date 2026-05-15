"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BountyBundle } from "@/lib/types";
import { T } from "@/components/bounty/theme";
import { Header } from "@/components/bounty/header";
import { Card, Btn, MonoText, Pill, SectionLabel, StageHeader } from "@/components/bounty/ui";
import { BountyBrief } from "@/components/bounty/bounty-brief";
import { MoneyFlow } from "@/components/bounty/money-flow";
import { TeamList } from "@/components/bounty/team-list";
import { JudgePanel } from "@/components/bounty/judge-panel";

export default function BountyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bountyId = params?.id as string;
  
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientPub, setClientPub] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamWallet, setTeamWallet] = useState("");
  const [submissionHash, setSubmissionHash] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBundle = useCallback(async () => {
    if (!bountyId) {
      setError("No bounty ID provided");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching bounty:", bountyId);
      const res = await fetch(`/api/bounties/${bountyId}`);
      const data = await res.json();
      console.log("API Response data:", data);
      
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      // Handle both possible response structures
      const bountyBundle = data.bounty ? data : { bounty: data };
      console.log("Setting bundle:", bountyBundle);
      setBundle(bountyBundle);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Fetch error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [bountyId]);

  useEffect(() => {
    fetchBundle();
    checkWallet();
  }, [fetchBundle]);

  const checkWallet = async () => {
    try {
      const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit");
      const { Networks } = await import("@creit.tech/stellar-wallets-kit");
      const { defaultModules } = await import("@creit.tech/stellar-wallets-kit/modules/utils");
      
      StellarWalletsKit.init({
        network: Networks.TESTNET,
        modules: defaultModules(),
      });

      const saved = localStorage.getItem("bounty_wallet");
      if (saved) {
        try {
          const info = await StellarWalletsKit.getAddress();
          if (info && info.address) setClientPub(info.address);
        } catch (err) {}
      }
    } catch (e) {}
  };

  const connectWallet = async () => {
    try {
      const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit");
      if (clientPub) {
        await StellarWalletsKit.profileModal();
        return;
      }
      const { address } = await StellarWalletsKit.authModal();
      if (address) {
        setClientPub(address);
        localStorage.setItem("bounty_wallet", address);
      }
    } catch (e) {}
  };

  const registerTeam = async () => {
    if (!teamName || !teamWallet) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bounties/${bountyId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: teamName, team_wallet: teamWallet }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBundle(data.bounty ? data : { bounty: data });
      setTeamName("");
      setTeamWallet("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const submitWork = async () => {
    if (!submissionHash || !clientPub) return;
    setActionLoading(true);
    try {
      const team = bundle?.teams?.find((t: any) => t.team_wallet === clientPub);
      if (!team) throw new Error("You must register first");
      
      const res = await fetch(`/api/bounties/${bountyId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team.team_id, submission_hash: submissionHash }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBundle(data.bounty ? data : { bounty: data });
      setSubmissionHash("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: T.mute, fontSize: 16 }}>Loading bounty...</div>
        <div style={{ color: T.mute, fontSize: 12 }}>ID: {bountyId}</div>
      </div>
    );
  }

  if (error || !bundle || !bundle.bounty) {
    return (
      <div style={{ minHeight: '100vh', background: T.panel, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card pad={30} style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.red, marginBottom: 8 }}>Error</div>
          <div style={{ color: T.ink2, marginBottom: 20 }}>{error || "Bounty not found"}</div>
          <div style={{ color: T.mute, fontSize: 12, marginBottom: 20 }}>ID: {bountyId}</div>
          <Btn tone="secondary" onClick={() => router.push('/')}>Back to Browse</Btn>
        </Card>
      </div>
    );
  }

  const bounty = bundle.bounty;
  const isOpen = bounty?.status === 'registration_open' || bounty?.status === 'funded';
  const isSubmissionOpen = bounty?.status === 'submission_closed' || bounty?.status === 'registration_open';
  const isCreator = clientPub === bounty?.creator_address;
  const isRegistered = bundle.teams?.some((t: any) => t.team_wallet === clientPub);

  return (
    <div style={{
      minHeight: '100vh', background: T.panel, color: T.ink,
      fontFamily: 'var(--geist-font-sans)',
      display: 'flex', flexDirection: 'column',
    }}>
      <Header
        status={bounty?.status || "unknown"}
        bountyId={bounty?.id || ""}
        escrowId={bounty?.escrow_id || ""}
        clientPub={clientPub}
        onConnectWallet={connectWallet}
      />

      <div style={{ padding: '16px 28px' }}>
        <Btn tone="ghost" size="sm" onClick={() => router.push('/')}>
          ← Back to Browse
        </Btn>
      </div>

      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '360px 1fr',
        gap: 20, padding: '0 28px 20px', maxWidth: 1440, width: '100%', margin: '0 auto',
        alignItems: 'start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BountyBrief bounty={bounty} />
          <MoneyFlow 
            status={bounty?.status || "draft"} 
            prizePool={bounty?.total_prize_pool || "0"} 
            escrowId={bounty?.escrow_id || "—"} 
            walletBalance="0.0000" 
          />
          <TeamList teams={bundle.teams || []} />
          <JudgePanel judges={bundle.judges || []} />
        </div>

        <Card pad={24}>
          <StageHeader
            eyebrow="Participate"
            title={isCreator ? "Your Bounty" : "Join the Competition"}
          />

          {!clientPub && (
            <div style={{ marginTop: 20, padding: 20, background: T.amberSoft, borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.amber, marginBottom: 12 }}>
                Connect your wallet to participate
              </div>
              <Btn tone="blue" onClick={connectWallet}>Connect Wallet</Btn>
            </div>
          )}

          {clientPub && isOpen && !isRegistered && !isCreator && (
            <div style={{ marginTop: 20, padding: 20, background: T.panel, borderRadius: 12 }}>
              <SectionLabel>Register Your Team</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" style={inputStyle} />
                <input value={teamWallet} onChange={(e) => setTeamWallet(e.target.value)} placeholder="Team Wallet (Stellar address)" style={inputStyle} />
                <Btn tone="blue" full onClick={registerTeam} disabled={!teamName || !teamWallet || actionLoading}>
                  {actionLoading ? 'Registering...' : 'Register Team'}
                </Btn>
              </div>
            </div>
          )}

          {isRegistered && !isCreator && (
            <div style={{ marginTop: 20, padding: 20, background: T.emeraldSoft, borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.emerald }}>
                ✓ You are registered for this bounty
              </div>
            </div>
          )}

          {clientPub && isSubmissionOpen && isRegistered && (
            <div style={{ marginTop: 20, padding: 20, background: T.panel, borderRadius: 12 }}>
              <SectionLabel>Submit Your Work</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <input value={submissionHash} onChange={(e) => setSubmissionHash(e.target.value)} placeholder="Submission Hash (IPFS CID)" style={inputStyle} />
                <Btn tone="blue" full onClick={submitWork} disabled={!submissionHash || actionLoading}>
                  {actionLoading ? 'Submitting...' : 'Submit Work'}
                </Btn>
              </div>
            </div>
          )}

          {isCreator && (
            <div style={{ marginTop: 20, padding: 20, background: T.blueSoft, borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.blue }}>
                You are the creator of this bounty. Funds are locked in escrow and cannot be withdrawn.
              </div>
              <div style={{ fontSize: 13, color: T.ink2, marginTop: 8 }}>
                Share this page link with participants so they can join.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${T.hair}`, background: T.surface,
  color: T.ink, fontSize: 14, fontFamily: 'inherit', outline: 'none',
};