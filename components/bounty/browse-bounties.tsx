"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bounty } from "@/lib/types";
import { T } from "./theme";
import { Header } from "./header";
import { Card, Btn, MonoText, Pill, SectionLabel } from "./ui";
import { BountyAppWrapper } from "../bounty-app-wrapper";

export function BrowseBounties() {
  const router = useRouter();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientPub, setClientPub] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchBounties();
    checkWallet();
  }, []);

  const fetchBounties = async () => {
    try {
      const res = await fetch("/api/bounties");

      if (!res.ok) {
        console.error("API returned status:", res.status);
        const text = await res.text();
        console.error("Response:", text.substring(0, 200));
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setBounties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch bounties:", err);
      setBounties([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const checkWallet = async () => {
    try {
      const { StellarWalletsKit } =
        await import("@creit.tech/stellar-wallets-kit");
      const { defaultModules } =
        await import("@creit.tech/stellar-wallets-kit/modules/utils");

      StellarWalletsKit.init({
        network: (await import("@creit.tech/stellar-wallets-kit")).Networks
          .TESTNET,
        modules: defaultModules(),
      });

      const saved = localStorage.getItem("bounty_wallet");
      if (saved) {
        try {
          const info = await StellarWalletsKit.getAddress();
          if (info && info.address) {
            setClientPub(info.address);
          }
        } catch (err) {
          // silent
        }
      }
    } catch (e) {
      // silent
    }
  };

  const connectWallet = async () => {
    try {
      const { StellarWalletsKit } =
        await import("@creit.tech/stellar-wallets-kit");

      if (clientPub) {
        await StellarWalletsKit.profileModal();
        return;
      }

      const { address } = await StellarWalletsKit.authModal();
      if (address) {
        setClientPub(address);
        localStorage.setItem("bounty_wallet", address);
      }
    } catch (e) {
      console.error("Wallet connect failed:", e);
    }
  };

  const getStatusPill = (status: string) => {
    const map: Record<string, { tone: any; label: string }> = {
      draft: { tone: "neutral", label: "Draft" },
      funded: { tone: "blue", label: "Funded" },
      registration_open: { tone: "emerald", label: "Open for Registration" },
      submission_closed: { tone: "amber", label: "Submissions Closed" },
      voting_open: { tone: "amber", label: "Voting Open" },
      judging_in_progress: { tone: "blue", label: "Judging" },
      judging_complete: { tone: "emerald", label: "Results Ready" },
      completed: { tone: "emerald", label: "Completed" },
      auto_resolved: { tone: "amber", label: "Auto-Resolved" },
    };
    const c = map[status] || { tone: "neutral", label: status };
    return <Pill tone={c.tone}>{c.label}</Pill>;
  };

  const isOpen = (bounty: Bounty) => {
    return bounty.status === "registration_open" || bounty.status === "funded";
  };

  if (showCreate) {
    return <BountyAppWrapper onBack={() => setShowCreate(false)} />;
  }

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
        status="browse"
        bountyId=""
        escrowId=""
        clientPub={clientPub}
        onConnectWallet={connectWallet}
      />

      <div
        style={{
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: "32px 28px",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              Browse Bounties
            </h1>
            <p style={{ color: T.ink2, margin: "8px 0 0", fontSize: 15 }}>
              Discover competitions, join teams, and earn rewards
            </p>
          </div>
          <Btn tone="blue" size="lg" onClick={() => setShowCreate(true)}>
            + Create Bounty
          </Btn>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <Pill tone="blue">All</Pill>
          <Pill tone="emerald">Open</Pill>
          <Pill tone="amber">Judging</Pill>
          <Pill tone="neutral">Completed</Pill>
        </div>

        {/* Bounty List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: T.mute }}>
            Loading bounties...
          </div>
        ) : bounties.length === 0 ? (
          <Card pad={40} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
              No bounties yet
            </div>
            <div style={{ color: T.ink2, marginBottom: 20, fontSize: 14 }}>
              Be the first to create a trust-minimized competition!
            </div>
            <Btn tone="blue" onClick={() => setShowCreate(true)}>
              Create the First Bounty
            </Btn>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              gap: 16,
            }}
          >
            {bounties.map((bounty) => (
              <Card
                key={bounty.id}
                pad={20}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => router.push(`/bounty/${bounty.id}`)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}
                    >
                      {bounty.title}
                    </div>
                    <MonoText style={{ fontSize: 11, color: T.mute }}>
                      by {bounty.creator_address.slice(0, 8)}...
                    </MonoText>
                  </div>
                  {getStatusPill(bounty.status)}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: T.ink2,
                    lineHeight: 1.5,
                    marginBottom: 16,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {bounty.description || "No description provided"}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    paddingTop: 12,
                    borderTop: `1px solid ${T.hairSoft}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 4 }}
                  >
                    <MonoText
                      style={{ fontSize: 18, fontWeight: 600, color: T.ink }}
                    >
                      {bounty.total_prize_pool}
                    </MonoText>
                    <MonoText style={{ fontSize: 11, color: T.mute }}>
                      USDC
                    </MonoText>
                  </div>
                  <div style={{ color: T.mute, fontSize: 12 }}>·</div>
                  <div style={{ fontSize: 12, color: T.mute }}>
                    {bounty.judge_count} judges
                  </div>
                  <div style={{ color: T.mute, fontSize: 12 }}>·</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isOpen(bounty) ? T.emerald : T.mute,
                    }}
                  >
                    {isOpen(bounty) ? "● Open" : "Closed"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
