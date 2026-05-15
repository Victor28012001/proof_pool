import { T } from "./theme";
import { Card, SectionLabel, MonoText } from "./ui";

export function MoneyFlow({
  status,
  prizePool,
  escrowId,
  walletBalance,
}: {
  status: string;
  prizePool: string;
  escrowId: string;
  walletBalance: string;
}) {
  const isCompleted = status === "completed";

  const flow = [
    { key: "wallet", label: "Creator Wallet", sub: `${walletBalance} USDC` },
    {
      key: "escrow",
      label: "Escrow Locked",
      sub: isCompleted ? "Released" : `${prizePool} USDC`,
    },
    { key: "competition", label: "Competition", sub: "Teams compete" },
    { key: "judging", label: "Peer + Judge Review", sub: "70/20/10 weight" },
    {
      key: "payout",
      label: "Winner Payout",
      sub: isCompleted ? "Paid" : "Pending",
    },
  ];

  const activeIdx =
    {
      draft: 0,
      funded: 1,
      registration_open: 1,
      submission_closed: 2,
      voting_open: 3,
      votes_revealed: 3,
      judging_complete: 4,
      completed: 4,
    }[status] ?? 0;

  return (
    <Card pad={18}>
      <SectionLabel
        right={
          escrowId !== "—" && (
            <MonoText style={{ fontSize: 10, color: T.mute }}>
              escrow {escrowId.slice(0, 6)}…
            </MonoText>
          )
        }
      >
        Prize Flow
      </SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {flow.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          const isLast = i === flow.length - 1;
          return (
            <div
              key={s.key}
              style={{
                display: "flex",
                gap: 12,
                position: "relative",
                paddingBottom: isLast ? 0 : 12,
              }}
            >
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 22,
                    bottom: 0,
                    width: 1.5,
                    background: done ? T.ink : T.hair,
                  }}
                />
              )}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: done ? T.ink : T.surface,
                  border: `1.5px solid ${active ? T.blue : done ? T.ink : T.hair}`,
                  display: "grid",
                  placeItems: "center",
                  color: done ? "#fff" : T.mute,
                  fontSize: 10,
                  boxShadow: active ? `0 0 0 3px ${T.blueSoft}` : "none",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: done ? T.ink : T.mute,
                  }}
                >
                  {s.label}
                </span>
                <MonoText
                  style={{ fontSize: 11, color: active ? T.blue : T.mute }}
                >
                  {s.sub}
                </MonoText>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
