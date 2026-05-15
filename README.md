# ProofPool

Decentralized competition protocol on Stellar — bounty funds lock in escrow, teams compete transparently, and payouts are automated.

ProofPool is a trust-minimized bounty protocol where creators lock prize pools in Trustless Work escrows on Stellar. Teams register with wallet-based identities, submit work, and are evaluated through a hybrid scoring system: expert judges (70%), constrained peer review (20%), and self-evaluation (10%). If judges miss deadlines, the protocol auto-resolves based on community votes. Funds are released automatically to team wallets — no rug pulls, no centralized favoritism.

Architecture
text
Next.js UI ◄──► ProofPool **API** (SQLite) ◄──► Trustless Work (Stellar escrow)
    │
    ┌──────────┼──────────┐
    │          │          │
    Teams       Judges     Peer Review
    Register    Score All   Random Assignment
    Submit      Entries    (Self + 1 Peer)
Setup

## Install dependencies

bash
npm install

## Configure environment

bash
cp .env.example .env.local
Open .env.local and fill in the required values:

Trustless Work (testnet escrow) env TW_API_BASE=[https://dev.api.trustlesswork.com](https://dev.api.trustlesswork.com) TW_API_KEY=<your-key>          # From [https://dapp.dev.trustlesswork.com](https://dapp.dev.trustlesswork.com) → **API** Keys ### Stellar Platform Wallet The platform wallet signs all escrow transactions (deploy, fund, release, resolve).

env PLATFORM_STELLAR_SECRET=S...    # Stellar secret key PLATFORM_STELLAR_PUBLIC_KEY=G... # Stellar public key STELLAR_NETWORK=testnet **USDC** Asset env USDC_STELLAR_ISSUER=**GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5** Database (optional) env # Defaults to SQLite. For production, use PostgreSQL: # DATABASE_URL=postgresql://... ## Fund and configure wallets Both your platform wallet and creator wallet need testnet **XLM** and **USDC** trustlines.

Platform wallet setup:

bash # Fund with testnet XLM curl "[https://friendbot.stellar.org?addr=<PLATFORM_PUBLIC_KEY>"](https://friendbot.stellar.org?addr=<PLATFORM_PUBLIC_KEY>")

# Visit to add USDC trustline automatically

curl *[http://localhost:**3000**/api/setup*](http://localhost:**3000**/api/setup") Creator wallet setup (Freighter browser extension):

Install Freighter and switch to Testnet

Fund with **XLM** via Friendbot

Add **USDC** asset: issuer **GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5**

## Run the dev server

bash npm run dev Open [http://localhost:**3000**.](http://localhost:**3000**.)

Using ProofPool Creating a Bounty Connect your wallet — Click *Connect Wallet* to link your Freighter Stellar wallet

Click *+ Create Bounty* — Opens the bounty configuration form

Fill in details:

Title & Description — What should teams build?

Prize Distribution — Set amounts for 1st, 2nd, 3rd place (and more)

Judge Wallets — Enter Stellar addresses of trusted judges

Timeline — Set registration end, submission deadline, judging period, and disbursement time

Click *Create & Lock Funds* — The protocol:

Creates the bounty in the database

Deploys a Trustless Work escrow on Stellar

Locks the prize pool in escrow

Opens registration

Joining a Bounty Browse bounties on the home page

Click a bounty card to view details

Connect your wallet and click *Register Team*

Enter team name and wallet address — This wallet receives payouts

Submit your work — Provide an **IPFS** hash or content identifier

Voting and Judging Teams vote on:

Their own submission (self-evaluation, 10% weight)

One randomly assigned peer team (peer review, 20% weight)

Judges score all submissions on criteria:

Creativity, Execution, Impact, Presentation

Judge scores carry 70% weight

Finalization and Payout After judging ends, scores are calculated using the weighted formula

The creator finalizes results

The protocol releases funds from escrow to winning team wallets

### Conflict Resolution

If judges miss the deadline:

The protocol automatically resolves based on community votes

Teams with the highest peer + self scores win

Marked as *auto-resolved* in the results

Funds are non-recoverable by the creator once locked in escrow.

### Scoring Model

Source	Weight
Expert Judges	70%
Peer Team Review	20%
Self Evaluation	10%
text
Final Score = (Judge_Avg × 0.7) + (Peer_Score × 0.2) + (Self_Score × 0.1)
### Bounty Lifecycle
Phase	Description
draft	Creator configures bounty
funded	Prize pool locked in escrow
registration_open	Teams can register
submission_closed	Deadline passed, review begins
voting_open	Teams and judges submit scores
votes_revealed	All team votes submitted
judging_complete	All judge scores in
completed	Winner paid, bounty finished
auto_resolved	Judges missed deadline, community vote decided
**API** Routes
Route	Method	Purpose
/api/bounties	**GET**	List all bounties
/api/bounties	**POST**	Create a new bounty
/api/bounties/[id]	**GET**	Get bounty details
/api/bounties/[id]	**DELETE**	Remove draft bounty (if funding fails)
/api/bounties/[id]/fund	**POST**	Deploy escrow + lock funds
/api/bounties/[id]/register	**POST**	Register a team
/api/bounties/[id]/submit	**POST**	Submit team work
/api/bounties/[id]/vote	**POST**	Submit team votes (self + peer)
/api/bounties/[id]/judge	**POST**	Submit judge scores
/api/bounties/[id]/finalize	**POST**	Calculate results + release funds
/api/stellar/balance	**GET**	Check wallet **USDC** balance
/api/stellar/add-trustline	**POST**	Add **USDC** trustline to wallet
/api/setup	**GET**	Configure platform wallet
/api/cron/check-deadlines	**GET**	Auto-resolve expired bounties
Escrow Flow (On-Chain)
text
Creator clicks *Create & Lock Funds*
    → **POST** /deployer/single-release  → unsigned **XDR**
    → Sign **XDR** with platform Stellar keypair
    → **POST** /helper/send-transaction  → contractId (real Stellar address)
    → **POST** /escrow/single-release/fund-escrow → lock prize pool

Teams register, submit, vote Judges score all entries

Creator finalizes
    → approve-milestone → sign + submit
    → release-funds     → sign + submit
    → Funds sent to winning team wallet

If judges miss deadline:
    → Auto-resolve by community votes
    → Release funds to community-chosen winner
### Key Design Choices
Team wallet identity — Teams are identified by Stellar wallet addresses, enabling multi-sig treasuries

Constrained peer review — Each team reviews only themselves + one randomly assigned peer, preventing collusion

Hybrid weighted scoring — Judges dominate (70%) but community has meaningful input (30%)

Immutable prize pools — Creator cannot withdraw funds once escrow is locked

Auto-resolution fallback — Community votes decide winners if judges fail to meet deadlines

Server-signed transactions — Platform signs all escrow operations; disputes can involve user signatures

No AI dependency — Pure competition logic, no model APIs required

### Current Limitations

Testnet only — Point TW_API_BASE to production **API** and swap keys for mainnet

Server-managed platform wallet — Secret keys in env vars; production needs **KMS**/**HSM**

Manual judge coordination — Judges must visit the bounty page to submit scores

No on-chain reputation yet — Reputation tables exist in schema but are not yet active