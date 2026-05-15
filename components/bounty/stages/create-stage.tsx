import { useState } from "react";
import { T } from "../theme";
import { Card, Btn, StageHeader } from "../ui";
import { AddTrustline } from "../add-trustline";

interface PrizePosition {
  position: number;
  title: string;
  amount: string;
  description: string;
}

export function CreateStage({
  onCreateBounty,
  loading,
  loadingLabel,
  clientPub,
  onConnectWallet,
}: {
  onCreateBounty: (data: {
    title: string;
    description: string;
    prize_distributions: any[];
    total_prize_pool: string;
    judge_addresses: string[];
    judge_count: number;
    registration_end: string;
    submission_end: string;
    judging_start: string;
    judging_end: string;
    disbursement_time: string;
  }) => void;
  loading: boolean;
  loadingLabel: string;
  clientPub: string | null;
  onConnectWallet: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prizes, setPrizes] = useState<PrizePosition[]>([
    { position: 1, title: "1st Place", amount: "", description: "" },
    { position: 2, title: "2nd Place", amount: "", description: "" },
    { position: 3, title: "3rd Place", amount: "", description: "" },
  ]);
  const [judgeAddresses, setJudgeAddresses] = useState<string[]>([""]);
  const [registrationEnd, setRegistrationEnd] = useState("");
  const [submissionEnd, setSubmissionEnd] = useState("");
  const [judgingStart, setJudgingStart] = useState("");
  const [judgingEnd, setJudgingEnd] = useState("");
  const [disbursementTime, setDisbursementTime] = useState("");

  const totalPrizePool = prizes
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    .toFixed(2); // Add .toFixed(2) to prevent floating point issues

  const canCreate =
    title.trim() &&
    description.trim() &&
    totalPrizePool !== "0.00" &&
    clientPub &&
    judgeAddresses.some((a) => a.trim()) &&
    registrationEnd &&
    submissionEnd &&
    judgingEnd &&
    disbursementTime;

  const addPrize = () => {
    setPrizes([
      ...prizes,
      {
        position: prizes.length + 1,
        title: `${prizes.length + 1}th Place`,
        amount: "",
        description: "",
      },
    ]);
  };

  const updatePrize = (
    index: number,
    field: keyof PrizePosition,
    value: string,
  ) => {
    const updated = [...prizes];
    updated[index] = { ...updated[index], [field]: value };
    setPrizes(updated);
  };

  const addJudge = () => setJudgeAddresses([...judgeAddresses, ""]);

  const updateJudge = (index: number, value: string) => {
    const updated = [...judgeAddresses];
    updated[index] = value;
    setJudgeAddresses(updated);
  };

  const handleSubmit = () => {
    const bountyData = {
      title,
      description,
      prize_distributions: prizes.filter(
        (p) => p.amount && Number(p.amount) > 0,
      ),
      total_prize_pool: totalPrizePool,
      judge_addresses: judgeAddresses.filter((a) => a.trim()),
      judge_count: judgeAddresses.filter((a) => a.trim()).length,
      registration_end: new Date(registrationEnd).toISOString(),
      submission_end: new Date(submissionEnd).toISOString(),
      judging_start: new Date(judgingStart).toISOString(),
      judging_end: new Date(judgingEnd).toISOString(),
      disbursement_time: new Date(disbursementTime).toISOString(),
    };

    onCreateBounty(bountyData);
  };

  return (
    <div>
      <StageHeader eyebrow="Create Competition" title="Configure your bounty" />
      <div style={{ padding: "24px", maxHeight: "70vh", overflowY: "auto" }}>
        {!clientPub && (
          <Card
            tint={T.amberSoft}
            pad={16}
            style={{ marginBottom: 20, borderColor: T.amber }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span>⚠️</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.amber }}>
                  Wallet not connected
                </div>
                <div style={{ fontSize: 13, color: T.ink2 }}>
                  Connect your Stellar wallet first.
                </div>
              </div>
            </div>
            <Btn
              tone="blue"
              size="sm"
              onClick={onConnectWallet}
              style={{ marginTop: 12 }}
            >
              Connect Wallet
            </Btn>
          </Card>
        )}

        {clientPub && (
          <AddTrustline
            clientPub={clientPub}
            onConnectWallet={onConnectWallet}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Basic Info */}
          <div>
            <label style={labelStyle}>Bounty Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Best DeFi Dashboard"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the competition rules and requirements..."
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            />
          </div>

          {/* Prize Distribution */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label style={labelStyle}>Prize Distribution</label>
              <Btn tone="ghost" size="sm" onClick={addPrize}>
                + Add Prize
              </Btn>
            </div>
            {prizes.map((prize, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr 1fr",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  value={prize.title}
                  onChange={(e) => updatePrize(i, "title", e.target.value)}
                  placeholder="Position title"
                  style={inputStyle}
                />
                <input
                  value={prize.description}
                  onChange={(e) =>
                    updatePrize(i, "description", e.target.value)
                  }
                  placeholder="Description (optional)"
                  style={inputStyle}
                />
                <input
                  type="number"
                  value={prize.amount}
                  onChange={(e) => updatePrize(i, "amount", e.target.value)}
                  placeholder="USDC amount"
                  style={inputStyle}
                />
              </div>
            ))}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: T.ink,
                marginTop: 8,
              }}
            >
              Total Prize Pool: {totalPrizePool} USDC
            </div>
          </div>

          {/* Judge Addresses */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label style={labelStyle}>Judge Wallet Addresses</label>
              <Btn tone="ghost" size="sm" onClick={addJudge}>
                + Add Judge
              </Btn>
            </div>
            {judgeAddresses.map((addr, i) => (
              <input
                key={i}
                value={addr}
                onChange={(e) => updateJudge(i, e.target.value)}
                placeholder="GABCD..."
                style={{ ...inputStyle, marginBottom: 8 }}
              />
            ))}
          </div>

          {/* Timeline */}
          <div>
            <label style={labelStyle}>Timeline</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={sublabelStyle}>Registration Ends</label>
                <input
                  type="datetime-local"
                  value={registrationEnd}
                  onChange={(e) => setRegistrationEnd(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={sublabelStyle}>Submission Ends</label>
                <input
                  type="datetime-local"
                  value={submissionEnd}
                  onChange={(e) => setSubmissionEnd(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={sublabelStyle}>Judging Starts</label>
                <input
                  type="datetime-local"
                  value={judgingStart}
                  onChange={(e) => setJudgingStart(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={sublabelStyle}>Judging Ends</label>
                <input
                  type="datetime-local"
                  value={judgingEnd}
                  onChange={(e) => setJudgingEnd(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={sublabelStyle}>Disbursement Time</label>
                <input
                  type="datetime-local"
                  value={disbursementTime}
                  onChange={(e) => setDisbursementTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.mute, marginTop: 8 }}>
              If judges fail to submit by disbursement time, winners will be
              determined by community votes.
            </div>
          </div>
        </div>

        <Btn
          tone="blue"
          size="lg"
          full
          onClick={handleSubmit}
          style={{ marginTop: 24 }}
          disabled={!canCreate || loading}
        >
          {!clientPub
            ? "Connect wallet"
            : loading
              ? loadingLabel || "Creating..."
              : `Create & Lock ${totalPrizePool} USDC`}
        </Btn>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: T.ink2,
  marginBottom: 6,
  display: "block",
};
const sublabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: T.mute,
  marginBottom: 4,
  display: "block",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: `1.5px solid ${T.hair}`,
  background: T.surface,
  color: T.ink,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};
