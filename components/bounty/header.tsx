import Link from "next/link";
import { T } from "./theme";
import { Btn, MonoText, Pill } from "./ui";
import Image from "next/image";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <Image src="/logo.jpg" alt="Logo" width={size} height={size} />
      <span
        style={{
          fontFamily: "var(--geist-font-sans)",
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: -0.4,
          color: T.ink,
        }}
      >
        BountyProtocol
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, any> = {
    draft: { tone: "neutral", label: "Draft" },
    funded: { tone: "blue", label: "Funded" },
    registration_open: { tone: "blue", label: "Open for Registration" },
    submission_closed: { tone: "amber", label: "Submissions Closed" },
    voting_open: { tone: "amber", label: "Voting Open" },
    votes_revealed: { tone: "blue", label: "Votes Revealed" },
    judging_complete: { tone: "emerald", label: "Judging Complete" },
    completed: { tone: "emerald", label: "Completed" },
    disputed: { tone: "red", label: "Disputed" },
  };

  const c = map[status] || { tone: "neutral", label: status };
  return <Pill tone={c.tone}>{c.label}</Pill>;
}

export function Header({
  status, bountyId, escrowId, clientPub, onConnectWallet, onBack
}: {
  status: string, bountyId: string, escrowId: string,
  clientPub: string | null, onConnectWallet: () => void,
  onBack?: () => void
}) {
  return (
    <header style={{
      height: 60, padding: '0 28px', borderBottom: `1px solid ${T.hair}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: T.surface, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>
        {bountyId && (
          <>
            <div style={{ width: 1, height: 24, background: T.hair }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MonoText style={{ fontSize: 11, color: T.mute, textTransform: 'uppercase' }}>
                {bountyId.slice(0, 8)}
              </MonoText>
              {status !== 'browse' && <StatusPill status={status} />}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {escrowId && (
          <Link href={`https://viewer.trustlesswork.com/${escrowId}`} target="_blank" style={{ textDecoration: 'none' }}>
            <Btn tone="secondary" size="sm">Escrow Viewer</Btn>
          </Link>
        )}
        <Btn tone={clientPub ? 'secondary' : 'primary'} size="sm" onClick={onConnectWallet}>
          {clientPub ? `${clientPub.slice(0, 4)}…${clientPub.slice(-4)}` : 'Connect Wallet'}
        </Btn>
      </div>
    </header>
  );
}
