"use client";

import { useState, useEffect, useCallback } from "react";
import { BountyBundle } from "@/lib/types";
import { T } from "./bounty/theme";
import { Header } from "./bounty/header";
import { Card, Btn, MonoText } from "./bounty/ui";
import { BountyBrief } from "./bounty/bounty-brief";
import { MoneyFlow } from "./bounty/money-flow";
import { TeamList } from "./bounty/team-list";
import { JudgePanel } from "./bounty/judge-panel";

// Stages
import { CreateStage } from "./bounty/stages/create-stage";
import { RegistrationStage } from "./bounty/stages/registration-stage";
import { SubmissionStage } from "./bounty/stages/submission-stage";
import { ReviewStage } from "./bounty/stages/review-stage";
import { VotingStage } from "./bounty/stages/voting-stage";
import { ResultsStage } from "./bounty/stages/results-stage";

export function BountyAppWrapper({ onBack }: { onBack?: () => void }) {
  const [bountyBundle, setBountyBundle] = useState<BountyBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [clientPub, setClientPub] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState("0.0000");

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const res = await fetch(`/api/stellar/balance?address=${address}`);
      const data = await res.json();
      if (data.balance) setWalletBalance(data.balance);
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, []);

  useEffect(() => {
    const initKit = async () => {
      try {
        const { StellarWalletsKit, Networks, KitEventType } =
          await import("@creit.tech/stellar-wallets-kit");

        // Import modules individually - these are the correct paths
        const { FreighterModule } =
          await import("@creit.tech/stellar-wallets-kit/modules/freighter");
        const { AlbedoModule } =
          await import("@creit.tech/stellar-wallets-kit/modules/albedo");
        // const { XBullModule } = await import("@creit.tech/stellar-wallets-kit/modules/xbull");
        const { LobstrModule } =
          await import("@creit.tech/stellar-wallets-kit/modules/lobstr");
        const { RabetModule } =
          await import("@creit.tech/stellar-wallets-kit/modules/rabet");

        StellarWalletsKit.init({
          network: Networks.TESTNET,
          modules: [
            new AlbedoModule(),
            new FreighterModule(),
            // new XBullModule(),
            new LobstrModule(),
            new RabetModule(),
          ],
        });

        // Auto-reconnect
        const saved = localStorage.getItem("bounty_wallet");
        if (saved) {
          try {
            const info = await StellarWalletsKit.getAddress();
            if (info && info.address) {
              setClientPub(info.address);
              fetchBalance(info.address);
            }
          } catch (err) {
            // silent
          }
        }
      } catch (e) {
        console.error("Kit init failed:", e);
      }
    };

    initKit();
  }, [fetchBalance]);

  const connectWallet = useCallback(async () => {
    try {
      const { StellarWalletsKit } =
        await import("@creit.tech/stellar-wallets-kit");

      if (clientPub) {
        await StellarWalletsKit.profileModal();
        return;
      }

      // This will show a modal with all available wallets including Albedo
      const { address } = await StellarWalletsKit.authModal();
      if (address) {
        setClientPub(address);
        localStorage.setItem("bounty_wallet", address);
        fetchBalance(address);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Wallet connect failed: ${msg}`);
    }
  }, [fetchBalance, clientPub]);

  const createBounty = async (data: any) => {
    setLoading(true);
    setLoadingLabel("Creating bounty...");
    setError(null);

    try {
      // Step 1: Create the bounty
      const res = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          prize_distributions: data.prize_distributions,
          total_prize_pool: data.total_prize_pool,
          judge_addresses: data.judge_addresses,
          judge_count: data.judge_count,
          creator_address: clientPub,
          registration_end: data.registration_end,
          submission_end: data.submission_end,
          judging_start: data.judging_start,
          judging_end: data.judging_end,
          disbursement_time: data.disbursement_time,
        }),
      });
      const responseData = await res.json();
      if (responseData.error) throw new Error(responseData.error);
      const bountyId = responseData.bounty?.id;
      if (!bountyId) throw new Error("Failed to create bounty");

      // Step 2: Deploy escrow + get fund XDR
      setLoadingLabel("Deploying escrow...");
      const fundRes = await fetch(`/api/bounties/${bountyId}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funder_address: clientPub }),
      });
      const fundData = await fundRes.json();
      if (fundData.error) throw new Error(fundData.error);

      // Step 3: If needs signature, prompt user to sign
      if (fundData.needsSignature) {
        setLoadingLabel("Please sign the transaction in your wallet...");

        const { StellarWalletsKit, Networks } =
          await import("@creit.tech/stellar-wallets-kit");

        // Get the current wallet address
        const { address } = await StellarWalletsKit.getAddress();

        console.log("Signing with address:", address);
        console.log(
          "Unsigned XDR:",
          fundData.unsignedTransaction.substring(0, 50) + "...",
        );

        // Sign the transaction - this should trigger Albedo popup
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(
          fundData.unsignedTransaction,
          {
            address: address,
            networkPassphrase: Networks.TESTNET,
          },
        );

        if (!signedTxXdr) {
          throw new Error("Transaction signing was cancelled or failed");
        }

        // Submit the signed transaction
        setLoadingLabel("Funding escrow...");
        const submitRes = await fetch(`/api/bounties/${bountyId}/fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            funder_address: clientPub,
            signedXdr: signedTxXdr,
          }),
        });
        const submitData = await submitRes.json();
        if (submitData.error) throw new Error(submitData.error);
        setBountyBundle(submitData);
      }

      fetchBalance(clientPub!);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const registerTeam = async (teamName: string, teamWallet: string) => {
    if (!bountyBundle) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bounties/${bountyBundle.bounty.id}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_name: teamName,
            team_wallet: teamWallet,
          }),
        },
      );
      const data = await res.json();
      setBountyBundle(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const submitWork = async (teamId: string, submissionHash: string) => {
    if (!bountyBundle) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bounties/${bountyBundle.bounty.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_id: teamId,
            submission_hash: submissionHash,
          }),
        },
      );
      const data = await res.json();
      setBountyBundle(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async (
    teamId: string,
    selfScore: number,
    peerScore: number,
    peerTeamId: string,
  ) => {
    if (!bountyBundle) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bounties/${bountyBundle.bounty.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          self_score: selfScore,
          peer_score: peerScore,
          peer_team_id: peerTeamId,
        }),
      });
      const data = await res.json();
      setBountyBundle(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const submitJudgeScore = async (judgeAddress: string, scores: any) => {
    if (!bountyBundle) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bounties/${bountyBundle.bounty.id}/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judge_address: judgeAddress, ...scores }),
      });
      const data = await res.json();
      setBountyBundle(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const finalizeBounty = async () => {
    if (!bountyBundle) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bounties/${bountyBundle.bounty.id}/finalize`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      setBountyBundle(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BountyApp
      status={bountyBundle?.bounty.status ?? "draft"}
      bountyBundle={bountyBundle}
      error={error}
      clientPub={clientPub}
      walletBalance={walletBalance}
      loading={loading}
      loadingLabel={loadingLabel}
      onConnectWallet={connectWallet}
      onCreateBounty={createBounty}
      onRegisterTeam={registerTeam}
      onSubmitWork={submitWork}
      onSubmitVote={submitVote}
      onSubmitJudgeScore={submitJudgeScore}
      onFinalize={finalizeBounty}
    />
  );
}

function BountyApp({
  status,
  bountyBundle,
  error,
  clientPub,
  walletBalance,
  loading,
  loadingLabel,
  onConnectWallet,
  onCreateBounty,
  onRegisterTeam,
  onSubmitWork,
  onSubmitVote,
  onSubmitJudgeScore,
  onFinalize,
}: any) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.panel,
        color: T.ink,
        fontFamily: "var(--geist-font-sans)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        status={status}
        bountyId={bountyBundle?.bounty.id ?? "—"}
        escrowId={bountyBundle?.bounty.escrow_id ?? ""}
        clientPub={clientPub}
        onConnectWallet={onConnectWallet}
      />

      {error && (
        <div
          style={{
            background: T.redSoft,
            border: `1px solid ${T.red}`,
            color: T.red,
            padding: "12px 28px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 20,
          padding: "20px 28px",
          maxWidth: 1440,
          width: "100%",
          margin: "0 auto",
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <BountyBrief bounty={bountyBundle?.bounty} />
          <MoneyFlow
            status={status}
            prizePool={bountyBundle?.bounty.total_prize_pool ?? "0"}
            escrowId={bountyBundle?.bounty.escrow_id ?? "—"}
            walletBalance={walletBalance}
          />
          {bountyBundle?.teams && <TeamList teams={bountyBundle.teams} />}
        </div>

        {/* Right column */}
        <Card pad={0} style={{ overflow: "hidden" }}>
          {status === "draft" && (
            <CreateStage
              onCreateBounty={onCreateBounty}
              loading={loading}
              loadingLabel={loadingLabel}
              clientPub={clientPub}
              onConnectWallet={onConnectWallet}
            />
          )}
          {status === "funded" && (
            <RegistrationStage
              onRegisterTeam={onRegisterTeam}
              teams={bountyBundle?.teams || []}
              loading={loading}
            />
          )}
          {status === "registration_open" && (
            <RegistrationStage
              onRegisterTeam={onRegisterTeam}
              teams={bountyBundle?.teams || []}
              loading={loading}
            />
          )}
          {status === "submission_closed" && (
            <SubmissionStage
              teams={bountyBundle?.teams || []}
              onSubmitWork={onSubmitWork}
              loading={loading}
            />
          )}
          {status === "voting_open" && bountyBundle && (
            <VotingStage
              teams={bountyBundle.teams}
              onSubmitVote={onSubmitVote}
              loading={loading}
            />
          )}
          {status === "judging_complete" && bountyBundle && (
            <ResultsStage
              finalScores={bountyBundle.final_scores}
              onFinalize={onFinalize}
              loading={loading}
            />
          )}
          {status === "completed" && bountyBundle && (
            <ResultsStage
              finalScores={bountyBundle.final_scores}
              completed={true}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
