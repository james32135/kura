import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Target,
  Network,
  Code2,
  GitBranch,
  Lock,
  Shield,
  Vote,
  CreditCard,
  Users,
  Database,
  Zap,
  Scale,
  KeyRound,
  Monitor,
  Rocket,
  FlaskConical,
  AlertTriangle,
  Route as RouteIcon,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  Layers,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { SectionLabel } from "@/components/landing/SectionLabel";
import {
  SystemArchitectureDiagram,
  DataFlowDiagram,
  ContractGraphDiagram,
  GovernanceFlowDiagram,
  ContributionFlowDiagram,
  EscrowFlowDiagram,
  DecryptionFlowDiagram,
  ReineiraOSSettlementDiagram,
} from "@/components/landing/DocsDiagrams";
import {
  PROTOCOL,
  STATS,
  CONTRACTS,
  FHE_OPS,
  PRIVACY_GUARANTEES,
  DEPENDENCIES,
  LIVE_TXS,
  WAVE5_FIXES,
} from "@/data/protocol";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Protocol Documentation — KURA" },
      {
        name: "description",
        content: `${STATS.protocolContracts} contracts, ${STATS.fheOperations} FHE operations, live on ${PROTOCOL.network}. Complete KURA protocol reference.`,
      },
    ],
  }),
  component: Docs,
});

const NAV = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "mission", label: "Mission", icon: Target },
  { id: "architecture", label: "Architecture", icon: Network },
  { id: "ecosystem", label: "Ecosystem Integrations", icon: Layers },
  { id: "contracts", label: "Contract System", icon: Code2 },
  { id: "dependencies", label: "Dependency Graph", icon: GitBranch },
  { id: "fhe", label: "FHE Operations", icon: Lock },
  { id: "privacy", label: "Privacy Model", icon: Shield },
  { id: "governance", label: "Governance", icon: Vote },
  { id: "credit", label: "Credit System", icon: CreditCard },
  { id: "registry", label: "Member Registry", icon: Users },
  { id: "vault", label: "Privacy Vault", icon: Database },
  { id: "streampay", label: "StreamPay", icon: Zap },
  { id: "disputes", label: "Dispute Resolution", icon: Scale },
  { id: "escrow", label: "Escrow System", icon: KeyRound },
  { id: "threshold", label: "Threshold Decryption", icon: Lock },
  { id: "frontend", label: "Frontend Architecture", icon: Monitor },
  { id: "deployment", label: "Deployment", icon: Rocket },
  { id: "testing", label: "Testing", icon: FlaskConical },
  { id: "security", label: "Security Model", icon: Shield },
  { id: "threats", label: "Threat Model", icon: AlertTriangle },
  { id: "flows", label: "User Flows", icon: RouteIcon },
  { id: "faq", label: "FAQ", icon: HelpCircle },
] as const;

function Docs() {
  return (
    <main className="relative bg-background text-foreground min-h-screen">
      <Navbar />
      <header className="relative pt-32 pb-16 px-6 border-b border-border/40">
        <div className="absolute inset-0 bg-radial-glow opacity-50 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <SectionLabel>Protocol Documentation</SectionLabel>
          <h1 className="mt-5 font-display text-4xl md:text-6xl font-semibold tracking-tight">
            KURA <span className="text-gradient-accent">Reference</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Confidential cooperative finance on {PROTOCOL.network}. {STATS.protocolContracts} protocol
            contracts, {STATS.fheOperations} FHE operations across {STATS.fheEnabledContracts}{" "}
            FHE-enabled contracts, {STATS.testsPassing} passing tests, live at{" "}
            <a href={PROTOCOL.liveUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              kura-gilt.vercel.app
            </a>
            .
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              `${STATS.protocolContracts} Contracts`,
              `${STATS.fheOperations} FHE Ops`,
              `${STATS.testsPassing} Tests`,
              PROTOCOL.network,
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/50 bg-surface/40 px-3 py-1 font-mono text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-[240px_1fr] gap-12">
        <aside className="hidden lg:block sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
          <nav>
            <ul className="space-y-0.5">
              {NAV.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface/50 transition"
                  >
                    <s.icon className="h-3.5 w-3.5 shrink-0" />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="space-y-24 max-w-3xl pb-24">
          <DocSection id="overview" label="Overview" title="What is KURA?">
            <p>
              KURA is a rotating savings and credit association (ROSCA) protocol where financial state
              lives as FHE ciphertext on-chain. Members contribute confidential USDC (cUSDC), submit
              sealed bids, accumulate encrypted credit scores, vote on governance proposals, and claim
              payouts — all without exposing amounts, strategies, or preferences to observers.
            </p>
            <p>
              The protocol runs on {PROTOCOL.network} (chain ID {PROTOCOL.chainId}) using Fhenix CoFHE (
              {PROTOCOL.fheLibrary}) with client-side encryption via {PROTOCOL.fheSdk}. Contracts compile
              with {PROTOCOL.compiler}, viaIR enabled, {PROTOCOL.optimizerRuns} optimizer runs, EVM{" "}
              {PROTOCOL.evmVersion}.
            </p>
            <SystemArchitectureDiagram className="mt-8" />
          </DocSection>

          <DocSection id="mission" label="Mission" title="Confidential cooperative finance">
            <p>
              Blockchains excel at enforcing rules across untrusted parties. Public ledgers fail at
              preserving the social dynamics that make savings circles work — members need privacy from
              each other and from external observers to participate honestly.
            </p>
            <p>
              KURA&apos;s mission is to deliver on-chain ROSCA mechanics with encryption as the default
              state, not an optional layer. Plaintext appears only when the protocol explicitly publishes
              aggregates through CoFHE threshold decryption.
            </p>
          </DocSection>

          <DocSection id="architecture" label="Architecture" title="Four-layer design">
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>
                <strong className="text-foreground">Client encryption</strong> — CoFHE SDK encrypts
                values client-side into InEuint64 / InEbool tuples before submission.
              </li>
              <li>
                <strong className="text-foreground">Homomorphic computation</strong> — Contracts perform
                FHE.add, FHE.select, FHE.lte, and 13 other operations on ciphertext handles.
              </li>
              <li>
                <strong className="text-foreground">Access control</strong> — FHE.isAllowed guards reads;
                FHE.allowSender grants caller-bound decrypt access; permits enable selective disclosure.
              </li>
              <li>
                <strong className="text-foreground">Threshold publication</strong> — Aggregates revealed
                via verifyDecryptResult / verifyDecryptResultBatch with committee signatures.
              </li>
            </ol>
            <DataFlowDiagram className="mt-8" />
          </DocSection>

          <DocSection id="ecosystem" label="Ecosystem Integrations" title="Fhenix CoFHE & ReineiraOS">
            <h3 className="font-display text-xl font-semibold text-foreground mt-6">Fhenix CoFHE</h3>
            <p>
              All homomorphic computation runs through {PROTOCOL.fheLibrary}. The frontend uses{" "}
              {PROTOCOL.fheSdk} for client-side encryption, permit-based decryption, and threshold
              signature collection via the CoFHE storage hub proxy.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Encryption</strong> — InEuint64 / InEbool / InEaddress
                tuples submitted on every encrypted write
              </li>
              <li>
                <strong className="text-foreground">ACL</strong> — FHE.isAllowed, FHE.allowThis,
                FHE.allowSender, FHE.allowPublic control handle access
              </li>
              <li>
                <strong className="text-foreground">Threshold decryption</strong> — verifyDecryptResult
                and verifyDecryptResultBatch require CoFHE committee signatures before plaintext reads
              </li>
              <li>
                <strong className="text-foreground">FHE operations</strong> — {STATS.fheOperations}{" "}
                deployed across {STATS.fheEnabledContracts} contracts (see FHE Operations section)
              </li>
            </ul>

            <h3 className="font-display text-xl font-semibold text-foreground mt-10">ReineiraOS</h3>
            <p>
              ReineiraOS interfaces are defined inline in KURA Solidity — no ReineiraOS npm package in
              this repo. Two pre-deployed external contracts on Arbitrum Sepolia are wired at deploy time
              in <code className="font-mono text-xs text-primary">tasks/deploy-kura.ts</code>:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">ConfidentialEscrow</strong> (
                <code className="font-mono text-xs">{CONTRACTS.external[0].address}</code>) — holds
                encrypted cUSDC; calls IConditionResolver on create and redeem
              </li>
              <li>
                <strong className="text-foreground">cUSDC</strong> (
                <code className="font-mono text-xs">{CONTRACTS.external[1].address}</code>) —
                confidential payment token for contributions, bids, StreamPay, and escrow funding
              </li>
              <li>
                <strong className="text-foreground">IConditionResolver</strong> — interface in{" "}
                <code className="font-mono text-xs">KuraConditionResolver.sol</code>; implemented by
                KuraConditionResolver (
                <code className="font-mono text-xs">{CONTRACTS.wave13[4].address}</code>)
              </li>
              <li>
                <strong className="text-foreground">KuraEscrowAdapter</strong> (
                <code className="font-mono text-xs">{CONTRACTS.wave13[5].address}</code>) — bridge
                calling ConfidentialEscrow.create / fund / redeem / redeemAndUnwrap
              </li>
            </ul>

            <h4 className="font-display text-lg font-semibold text-foreground mt-8">
              Credit-gated redemption
            </h4>
            <p>
              On escrow creation, resolver data is <code className="font-mono text-xs">abi.encode(winner, minCreditScore)</code>.
              ConfidentialEscrow calls{" "}
              <code className="font-mono text-xs">KuraConditionResolver.onConditionSet</code>. On redeem,
              ConfidentialEscrow calls{" "}
              <code className="font-mono text-xs">isConditionMet</code>, which reads{" "}
              <code className="font-mono text-xs">KuraCredit.getCreditStats</code> and maps minScore to
              tier (5→Bronze, 15→Silver, 30→Gold, 50→Diamond).
            </p>

            <h4 className="font-display text-lg font-semibold text-foreground mt-8">
              Confidential settlement
            </h4>
            <p>
              Escrow owner and amount are encrypted at creation. Winners redeem via{" "}
              <code className="font-mono text-xs">claimEscrow</code> (plaintext winner check),{" "}
              <code className="font-mono text-xs">claimAndUnwrap</code> (redeem + USDC unwrap), or{" "}
              <code className="font-mono text-xs">claimEscrowWithProof</code> (
              FHE.eq(eaddress) + verifyDecryptResult). Admin creates via{" "}
              <code className="font-mono text-xs">createWinnerEscrow</code> and funds via{" "}
              <code className="font-mono text-xs">fundEscrow</code>.
            </p>

            <ReineiraOSSettlementDiagram className="mt-8" />

            <p className="mt-4 text-sm text-muted-foreground">
              KuraBid <code className="font-mono text-xs">settleRound</code> does not call
              KuraEscrowAdapter on-chain — escrow setup is a separate admin step. The production{" "}
              <code className="font-mono text-xs">useAutoSettler</code> hook uses{" "}
              <code className="font-mono text-xs">KuraCircle.transferPool</code> for round advance;
              <code className="font-mono text-xs">useKuraEscrowAdapter</code> exposes claim paths but is
              not yet wired to a route. No escrow unit tests exist in <code className="font-mono text-xs">test/</code>.
            </p>
          </DocSection>

          <DocSection id="contracts" label="Contract System" title={`${STATS.protocolContracts} protocol contracts`}>
            <p>
              Wave 1–3 established core ROSCA mechanics. Wave 4 added membership, governance, streaming
              payments, disputes, and privacy vault. Three external contracts provide cUSDC, USDC, and
              ReineiraOS ConfidentialEscrow integration.
            </p>
            <div className="mt-6 space-y-6">
              <ContractGroup title="Wave 1–3" items={CONTRACTS.wave13} />
              <ContractGroup title="Wave 4" items={CONTRACTS.wave4} />
              <ContractGroup title="External" items={CONTRACTS.external} />
            </div>
          </DocSection>

          <DocSection id="dependencies" label="Dependency Graph" title="How contracts connect">
            <ContractGraphDiagram className="mb-6" />
            <div className="overflow-hidden rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-surface/40">
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase text-primary">Contract</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase text-primary">Depends On</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPENDENCIES.map((row) => (
                    <tr key={row.contract} className="border-b border-border/30">
                      <td className="px-4 py-3 font-mono text-xs">{row.contract}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.dependsOn.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="fhe" label="FHE Operations" title={`${STATS.fheOperations} deployed operations`}>
            <p>
              Every operation listed below is deployed in production contracts — not speculative. Wave 4
              operations are marked.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-surface/40">
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase text-primary">Operation</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase text-primary">Contracts</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase text-primary">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {FHE_OPS.map((op) => (
                    <tr key={op.op} className="border-b border-border/30">
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        {op.op}
                        {"wave4" in op && op.wave4 && (
                          <span className="ml-2 text-[10px] text-warm uppercase">Wave 4</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{op.contracts}</td>
                      <td className="px-4 py-3 text-muted-foreground">{op.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="privacy" label="Privacy Model" title="Structural guarantees">
            <p>
              Privacy in KURA is enforced by contract logic and FHE semantics — not by frontend
              concealment or off-chain promises.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-surface/40">
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase text-primary">Domain</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase text-primary">Guarantee</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIVACY_GUARANTEES.map((row) => (
                    <tr key={row.domain} className="border-b border-border/30">
                      <td className="px-4 py-3 font-medium">{row.domain}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.guarantee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="governance" label="Governance" title="Private vote accumulation">
            <p>
              KuraGovernance stores encrypted vote counters — not individual ballots. Members submit
              InEbool votes; the contract accumulates via FHE.select + FHE.add into encYesCount /
              encTotalVotes. Individual votes are never persisted.
            </p>
            <p>
              Proposals close through closeVoteBatch, which calls FHE.verifyDecryptResultBatch to
              verify threshold-signed tallies before publishing results.
            </p>
            <GovernanceFlowDiagram className="mt-6" />
          </DocSection>

          <DocSection id="credit" label="Credit System" title="Encrypted reputation">
            <p>
              KuraCredit (Wave 1–3) tracks encrypted scores with tier assignment via FHE.select chains.
              KuraCreditV2 (Wave 4) adds weighted scoring (FHE.mul, FHE.div), tier range proofs
              (FHE.and + FHE.gte + FHE.lte), and quadratic governance weight (FHE.square).
            </p>
            <p>
              getMyScore and verifyTierInRange use FHE.isAllowed ACL guards — unauthorized callers
              cannot read another member&apos;s score handle.
            </p>
          </DocSection>

          <DocSection id="registry" label="Member Registry" title="Encrypted membership slots">
            <p>
              KuraMemberRegistry stores member addresses as eaddress values in fixed slots. isMember
              returns an ebool without revealing slot index. Random winner selection uses FHE.rem on
              encrypted slot indices; membership matching uses FHE.or across slots.
            </p>
          </DocSection>

          <DocSection id="vault" label="Privacy Vault" title="Encrypted circle metadata">
            <p>
              KuraPrivacyVault stores circle names and descriptions as encrypted 8-byte euint64 chunks.
              Private circles revert read attempts from non-members — metadata is invisible to outsiders
              at the contract level.
            </p>
          </DocSection>

          <DocSection id="streampay" label="StreamPay" title="Per-block encrypted contributions">
            <p>
              KuraStreamPay decouples contribution timing from lump-sum deposits. Members lock an
              encrypted total and rate; collection computes due = rate × elapsed blocks, caps via
              FHE.min(due, remaining), and updates balances with FHE.sub.
            </p>
            <ContributionFlowDiagram className="mt-6" />
          </DocSection>

          <DocSection id="disputes" label="Dispute Resolution" title="Blind admin resolution">
            <p>
              KuraDisputeResolution lets members raise disputes with encrypted claimed amounts. Admins
              resolve by setting a validity ebool — they see whether a claim passes FHE.gte checks against
              the pool, not the claimed amount itself. Resolution paths use FHE.select.
            </p>
          </DocSection>

          <DocSection id="escrow" label="Escrow System" title="Credit-gated ConfidentialEscrow (ReineiraOS)">
            <p>
              KuraEscrowAdapter integrates ReineiraOS ConfidentialEscrow at{" "}
              <code className="font-mono text-xs text-primary">{CONTRACTS.external[0].address}</code>.
              KuraConditionResolver implements ReineiraOS IConditionResolver and gates redemption on
              KuraCredit tier. See{" "}
              <a href="#ecosystem" className="text-primary hover:underline">
                Ecosystem Integrations
              </a>{" "}
              for the full settlement diagram.
            </p>
            <EscrowFlowDiagram className="mt-6" />
            <ReineiraOSSettlementDiagram className="mt-6" />
          </DocSection>

          <DocSection id="threshold" label="Threshold Decryption" title="Verified publication">
            <p>
              Sensitive aggregates — winning bid amounts, governance tallies — pass through CoFHE
              threshold decryption. Contracts call FHE.allowPublic on handles, receive committee
              signatures, and verify via verifyDecryptResult or verifyDecryptResultBatch before reading
              plaintext through getDecryptResultSafe.
            </p>
            <DecryptionFlowDiagram className="mt-6" />
            <p className="mt-4 text-sm text-muted-foreground">
              KuraBid uses verifyDecryptResult in settleRound. KuraGovernance uses
              verifyDecryptResultBatch in closeVoteBatch.
            </p>
          </DocSection>

          <DocSection id="frontend" label="Frontend Architecture" title="React + CoFHE integration">
            <p>
              The production app at {PROTOCOL.liveUrl} is a TanStack Router SPA with wagmi/viem wallet
              integration. FHE encryption flows through @cofhe/sdk with a CoFHE storage hub proxy (
              /storage-hub.html) to avoid cross-origin isolation conflicts with wallet iframes.
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground text-sm">
              <li>Full InEuint64 / InEbool tuple ABIs for contract writes</li>
              <li>Dynamic gas via getGasFees(publicClient) on Wave 5 write hooks</li>
              <li>Permit-based selective decryption for member-owned handles</li>
              <li>Circle-scoped action guards with explicit selected-circle checks</li>
            </ul>
          </DocSection>

          <DocSection id="deployment" label="Deployment" title="Live on Arbitrum Sepolia">
            <p>
              Deployed {PROTOCOL.deployed}. Wave 5 production validation completed {PROTOCOL.validated}{" "}
              at commit <code className="font-mono text-primary text-sm">{PROTOCOL.deployCommit}</code>.
              Deployer:{" "}
              <code className="font-mono text-xs text-muted-foreground">{PROTOCOL.deployer}</code>
            </p>
            <div className="mt-6 rounded-xl border border-border/50 bg-card/30 p-5">
              <p className="font-mono text-xs uppercase text-primary mb-3">Confirmed Live Transactions</p>
              <ul className="space-y-2">
                {LIVE_TXS.map((tx) => (
                  <li key={tx.hash}>
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex justify-between gap-2 text-xs hover:text-primary transition"
                    >
                      <span className="text-muted-foreground">{tx.label}</span>
                      <span className="font-mono inline-flex items-center gap-1">
                        {tx.hash.slice(0, 12)}…
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <p className="font-mono text-xs uppercase text-primary mb-3">Wave 5 Fix Commits</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {WAVE5_FIXES.map((f) => (
                  <li key={f.commit}>
                    <code className="text-primary font-mono text-xs">{f.commit}</code> — {f.purpose}
                  </li>
                ))}
              </ul>
            </div>
          </DocSection>

          <DocSection id="testing" label="Testing" title="Validation coverage">
            <p>
              The test suite reports {STATS.testsPassing} passing tests with {STATS.testsPending} pending
              (primarily cUSDC-dependent integration paths). Wave 5 validated {STATS.confirmedLiveTxs}{" "}
              confirmed transactions across {STATS.verifiedWorkflows} live workflows on production Vercel.
            </p>
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              {[
                { v: STATS.testsPassing, l: "Passing" },
                { v: STATS.testsPending, l: "Pending" },
                { v: STATS.verifiedWorkflows, l: "Live Workflows" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-border/50 bg-surface/30 p-5 text-center">
                  <p className="font-display text-3xl font-semibold text-gradient-accent">{s.v}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="security" label="Security Model" title="Trust the cryptography">
            <ul className="space-y-3 text-muted-foreground">
              <li>FHE ciphertext handles for all financial state — no plaintext storage</li>
              <li>FHE.isAllowed ACL on every protected read path</li>
              <li>Threshold committee signatures required before aggregate publication</li>
              <li>Permit-based selective disclosure — members control their own decrypt access</li>
              <li>Silent minimum contribution checks via FHE.select — failed deposits zero out without revert</li>
              <li>viaIR compilation enabled for complex FHE control flow</li>
            </ul>
          </DocSection>

          <DocSection id="threats" label="Threat Model" title="What KURA protects against">
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5">
                <p className="font-mono text-xs uppercase text-primary mb-3">Mitigated</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Contribution amount surveillance</li>
                  <li>Sealed bid strategy leakage</li>
                  <li>Credit score doxing</li>
                  <li>Individual vote tracing</li>
                  <li>Membership slot enumeration</li>
                </ul>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                <p className="font-mono text-xs uppercase text-muted-foreground mb-3">Out of scope</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Network-level traffic analysis of wallet addresses</li>
                  <li>CoFHE threshold committee compromise</li>
                  <li>Client-side key extraction from member devices</li>
                  <li>Timing correlation across unrelated transactions</li>
                </ul>
              </div>
            </div>
          </DocSection>

          <DocSection id="flows" label="User Flows" title="End-to-end paths">
            <ol className="space-y-4">
              {[
                "Connect wallet on Arbitrum Sepolia (chain 421614)",
                "Obtain test USDC, wrap to cUSDC, set operator on token contract",
                "Create encrypted circle or join existing circle",
                "Contribute encrypted amount — FHE.gte silent minimum check",
                "Submit sealed bid via KuraBid — FHE.lte + FHE.select tracks lowest",
                "Accumulate credit via KuraCredit / KuraCreditV2",
                "Participate in governance, Stream Pay, Privacy Vault, disputes",
                "Claim payout via KuraEscrowAdapter + ConfidentialEscrow",
              ].map((step, i) => (
                <li key={step} className="flex gap-4 text-muted-foreground">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 font-mono text-xs text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </DocSection>

          <DocSection id="faq" label="FAQ" title="Common questions">
            <FaqList
              items={[
                {
                  q: "Is KURA a demo or production protocol?",
                  a: `Production-deployed on ${PROTOCOL.network} with ${STATS.confirmedLiveTxs} confirmed live transactions validated in Wave 5 (${PROTOCOL.validated}).`,
                },
                {
                  q: "How many contracts and FHE operations?",
                  a: `${STATS.protocolContracts} protocol contracts, ${STATS.deployedAddresses} deployed addresses, ${STATS.fheOperations} FHE operations across ${STATS.fheEnabledContracts} FHE-enabled contracts.`,
                },
                {
                  q: "Why FHE instead of ZK or TEE?",
                  a: "ROSCA state requires ongoing homomorphic computation — pool accumulation, bid comparison, vote tallying — on encrypted data throughout the circle lifecycle. FHE enables this without revealing intermediate values.",
                },
                {
                  q: "When does plaintext appear?",
                  a: "Only when the protocol explicitly publishes via threshold decryption — winning bid after closeRound, governance tallies after closeVoteBatch. Individual contributions, losing bids, and votes never decrypt.",
                },
                {
                  q: "What token does KURA use?",
                  a: `Confidential USDC (cUSDC) at 0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f, backed by test USDC at 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d on Arbitrum Sepolia.`,
                },
                {
                  q: "How do I run the app locally?",
                  a: "Clone the repository, install dependencies in frontend/, configure wallet for Arbitrum Sepolia, and run the dev server. See README.md for full setup instructions.",
                },
              ]}
            />
          </DocSection>

          <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-8 text-center">
            <h3 className="font-display text-2xl font-semibold">Ready to participate?</h3>
            <p className="mt-3 text-muted-foreground">
              Open the live app or explore contract addresses on Arbiscan.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-sm font-semibold"
              >
                Launch App
              </Link>
              <a
                href={`https://sepolia.arbiscan.io/address/${CONTRACTS.wave13[0].address}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm hover:bg-surface/50 transition"
              >
                View KuraCircle on Arbiscan
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  );
}

function DocSection({
  id,
  label,
  title,
  children,
}: {
  id: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Reveal>
        <SectionLabel>{label}</SectionLabel>
        <h2 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">{children}</div>
      </Reveal>
    </section>
  );
}

function ContractGroup({
  title,
  items,
}: {
  title: string;
  items: readonly { name: string; address: string; wave?: string }[];
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wider text-primary mb-3">{title}</p>
      <div className="space-y-2">
        {items.map((c) => (
          <a
            key={c.address}
            href={`https://sepolia.arbiscan.io/address/${c.address}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-card/30 px-4 py-3 hover:border-primary/30 transition group"
          >
            <span className="font-mono text-sm">{c.name}</span>
            <span className="font-mono text-xs text-muted-foreground group-hover:text-primary">
              {c.address.slice(0, 10)}…{c.address.slice(-6)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.q} className="rounded-xl border border-border/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface/30 transition"
          >
            <span className="font-medium text-foreground">{item.q}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
