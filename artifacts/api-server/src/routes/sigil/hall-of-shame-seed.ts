/**
 * Sigil — Hall of Shame seeder
 * Inserts pre-curated analysis records for infamous real-world hacks/exploits.
 * Runs once at server start if no hall_of_shame rows exist.
 */

import { db } from "@workspace/db";
import { analysesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

interface SeedEntry {
  input: string;
  inputType: string;
  network: string;
  hallOfShameLabel: string;
  summary: string;
  verdict: string;
  verdictReason: string;
  riskScore: number;
  riskLevel: string;
  warnings: string[];
  positives: string[];
  details: Record<string, unknown>;
}

const SEED_ENTRIES: SeedEntry[] = [
  // ── 1. Bybit Cold Wallet ─────────────────────────────────────────────────
  {
    input: "0x1Db92e2EeBC8E0c075a02BeA49a2935BcD2dFCF4",
    inputType: "address",
    network: "mainnet",
    hallOfShameLabel: "Bybit Hack · $1.5B",
    summary:
      "Bybit's Ethereum cold wallet — a Safe multisig drained for $1.5B on February 21, 2025 by North Korea's Lazarus Group. Attackers injected malicious calldata via a compromised Safe{Wallet} UI, tricking Bybit signers into approving a contract upgrade that handed full control to the attacker.",
    verdict: "dangerous",
    verdictReason: "Dangerous — Lazarus Group target; wallet drained $1.5B via Safe UI injection",
    riskScore: 97,
    riskLevel: "critical",
    warnings: [
      "Largest crypto hack ever: $1.5B drained in a single transaction on Feb 21 2025",
      "Lazarus Group (North Korea) replaced the Safe singleton implementation with a malicious contract",
      "All three Bybit co-signers were deceived by a poisoned Safe{Wallet} UI — appeared as a routine transfer",
      "Funds immediately split across hundreds of addresses and routed through THORChain to obscure trails",
      "FBI issued a formal advisory attributing the attack to North Korean state-sponsored actors (TraderTraitor)",
    ],
    positives: [
      "Bybit remained solvent and covered losses from reserves — customer funds were not impacted",
    ],
    details: {
      hallOfShameAmountUsd: "$1.5B",
      hallOfShameYear: "2025",
      hallOfShameAttacker: "Lazarus Group (DPRK / TraderTraitor)",
      hallOfShameVector: "Safe multisig UI manipulation",
    },
  },

  // ── 2. Ronin Bridge ───────────────────────────────────────────────────────
  {
    input: "0x1a2a1c938CE3eC39b6D47113c7955bAA9DD454F2",
    inputType: "address",
    network: "mainnet",
    hallOfShameLabel: "Ronin Bridge · $625M",
    summary:
      "The Axie Infinity Ronin bridge — site of the largest DeFi hack in history at the time. Lazarus Group silently compromised 5 of 9 Ronin validator private keys in March 2022 and drained 173,600 ETH and 25.5M USDC in two transactions. The breach went undetected for 6 days until a user tried to withdraw.",
    verdict: "dangerous",
    verdictReason: "Dangerous — bridge compromised for $625M; Lazarus Group attacker contract",
    riskScore: 95,
    riskLevel: "critical",
    warnings: [
      "Exploited for $625M (173,600 ETH + 25.5M USDC) in March 2022 — largest DeFi hack at the time",
      "Lazarus Group compromised 5 of 9 Ronin validator keys, bypassing multi-sig security completely",
      "The breach went undetected for 6 days — discovered only when a user tried to withdraw 5,000 ETH",
      "Stolen funds moved through Tornado Cash and Blender.io before partial US Treasury recovery",
      "OFAC later sanctioned the attacker's Ethereum wallets; Blender.io sanctioned as first ever mixer",
    ],
    positives: [
      "Sky Mavis raised $150M and the US government recovered ~$30M — victims were eventually made whole",
    ],
    details: {
      hallOfShameAmountUsd: "$625M",
      hallOfShameYear: "2022",
      hallOfShameAttacker: "Lazarus Group (DPRK)",
      hallOfShameVector: "Validator private key compromise",
    },
  },

  // ── 3. Tornado Cash ETH 0.1 Pool ──────────────────────────────────────────
  {
    input: "0x722122dF12D4e14e13Ac3b6895a86e84145b6967",
    inputType: "address",
    network: "mainnet",
    hallOfShameLabel: "Tornado Cash · $7.6B Laundered",
    summary:
      "OFAC-sanctioned Ethereum mixing contract used by Lazarus Group, Harmony bridge attackers, Nomad exploiters, and ransomware operations to launder over $7.6 billion in illicit cryptocurrency. Sanctioned by the US Treasury in August 2022. Interacting with this contract is illegal for US persons.",
    verdict: "dangerous",
    verdictReason: "Dangerous — OFAC sanctioned mixer; illegal for US persons to interact with",
    riskScore: 96,
    riskLevel: "critical",
    warnings: [
      "OFAC sanctioned under Executive Order 13694 since August 8, 2022 — illegal for US persons",
      "Used by Lazarus Group to launder $455M from the Ronin Bridge hack alone",
      "Used to mix stolen funds from Harmony Horizon bridge ($100M) and Nomad bridge ($190M)",
      "Deposits routed through this contract are flagged by Chainalysis, TRM Labs, and all major exchanges",
      "Dutch authorities arrested Tornado Cash developer Roman Storm; he faces decades in US federal prison",
    ],
    positives: [],
    details: {
      hallOfShameAmountUsd: "$7.6B laundered",
      hallOfShameYear: "2019–2022",
      hallOfShameAttacker: "Multiple (Lazarus Group, ransomware operations)",
      hallOfShameVector: "Crypto mixing / money laundering",
    },
  },

  // ── 4. Wormhole Bridge ────────────────────────────────────────────────────
  {
    input: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
    inputType: "address",
    network: "mainnet",
    hallOfShameLabel: "Wormhole Bridge · $320M",
    summary:
      "The Wormhole cross-chain bridge — exploited for 120,000 wETH ($320M) in February 2022 via a signature verification bypass. The attacker spoofed a guardian signature validation to mint wrapped ETH on Solana without depositing any real ETH as collateral on this Ethereum contract.",
    verdict: "dangerous",
    verdictReason: "Dangerous — cross-chain bridge exploited for $320M via signature bypass",
    riskScore: 91,
    riskLevel: "critical",
    warnings: [
      "Exploited for 120,000 wETH ($320M) on February 2, 2022 via guardian signature spoofing",
      "Attacker called a deprecated instruction that still had guardian-level privileges to bypass verification",
      "Minted 120,000 wETH on Solana backed by zero actual collateral on the Ethereum side",
      "Bridge design flaw: single guardian key model meant one compromised validator could forge any message",
      "Wormhole contracts were not formally audited before the exploited code path was introduced",
    ],
    positives: [
      "Jump Crypto (Wormhole backer) injected $320M in ETH within 24 hours to restore full collateral",
    ],
    details: {
      hallOfShameAmountUsd: "$320M",
      hallOfShameYear: "2022",
      hallOfShameAttacker: "Anonymous",
      hallOfShameVector: "Signature verification bypass",
    },
  },

  // ── 5. Nomad Bridge ───────────────────────────────────────────────────────
  {
    input: "0x88A69B4E698A4B090DF6CF5Bd7B2D47325Ad30A3",
    inputType: "address",
    network: "mainnet",
    hallOfShameLabel: "Nomad Bridge · $190M",
    summary:
      "The Nomad cross-chain bridge contract — victim of a chaotic 'free-for-all' exploit in August 2022. A routine upgrade accidentally initialized the trusted root to 0x0, making every message appear valid. Anyone who copy-pasted the original attacker's transaction data could drain funds — hundreds of opportunistic wallets joined.",
    verdict: "dangerous",
    verdictReason: "Dangerous — bridge exploit allowed anyone to copy-paste drain transactions",
    riskScore: 90,
    riskLevel: "critical",
    warnings: [
      "Exploited for $190M on August 1, 2022 — became the first 'decentralized' hack anyone could join",
      "A routine upgrade set the trusted merkle root to 0x0, making every cross-chain message automatically valid",
      "The original attacker's calldata was publicly visible on-chain; 300+ wallets copied it to steal funds",
      "WBTC, WETH, USDC, DAI, and many ERC-20 tokens were drained across the bridge",
      "Upgradeability without timelock allowed the fatal misconfiguration to take effect immediately",
    ],
    positives: [
      "Some white-hat participants returned funds voluntarily; Nomad recovered ~$36M (~20%) through negotiations",
    ],
    details: {
      hallOfShameAmountUsd: "$190M",
      hallOfShameYear: "2022",
      hallOfShameAttacker: "Multiple (300+ opportunistic wallets)",
      hallOfShameVector: "Merkle root initialization bug",
    },
  },

  // ── 6. Euler Finance ─────────────────────────────────────────────────────
  {
    input: "0x27182842E098f60e3D576794A5bFFb0777E025d3",
    inputType: "address",
    network: "mainnet",
    hallOfShameLabel: "Euler Finance · $197M",
    summary:
      "Euler Finance's lending protocol — hit by a complex flash loan attack in March 2023. The attacker exploited a missing health-check in the donateToReserves() function to create a massively over-leveraged position, then self-liquidated at a profit. 11 DeFi protocols using Euler as a building block were simultaneously impacted.",
    verdict: "dangerous",
    verdictReason: "Dangerous — lending protocol exploited $197M via flash loan health-check bypass",
    riskScore: 86,
    riskLevel: "critical",
    warnings: [
      "Exploited for $197M on March 13, 2023 — one of the largest flash loan attacks ever",
      "The donateToReserves() function lacked a health-check, letting an attacker bypass liquidation protection",
      "Attacker created a 10× leveraged position via flash loan, donated to reserves to trigger underwater status, then self-liquidated at profit",
      "11 DeFi protocols with Euler integrations were simultaneously impacted in the same attack bundle",
      "The vulnerable code had passed at least 10 professional security audits prior to the exploit",
    ],
    positives: [
      "Attacker returned ~$177M after on-chain negotiations — most affected users were eventually made whole",
      "Euler team coordinated a rapid response and openly communicated throughout the incident",
    ],
    details: {
      hallOfShameAmountUsd: "$197M",
      hallOfShameYear: "2023",
      hallOfShameAttacker: "Anonymous (returned most funds)",
      hallOfShameVector: "Flash loan / health-check bypass",
    },
  },
];

export async function seedHallOfShame(): Promise<void> {
  try {
    const existing = await db
      .select({ id: analysesTable.id })
      .from(analysesTable)
      .where(eq(analysesTable.hallOfShame, true))
      .limit(1);

    if (existing.length > 0) {
      logger.info("Hall of Shame already seeded — skipping");
      return;
    }

    logger.info("Seeding Hall of Shame entries…");

    for (const entry of SEED_ENTRIES) {
      await db.insert(analysesTable).values({
        input: entry.input,
        inputType: entry.inputType,
        network: entry.network,
        summary: entry.summary,
        verdict: entry.verdict,
        verdictReason: entry.verdictReason,
        riskScore: entry.riskScore,
        riskLevel: entry.riskLevel,
        warnings: entry.warnings,
        positives: entry.positives,
        details: entry.details,
        hallOfShame: true,
        hallOfShameLabel: entry.hallOfShameLabel,
        createdAt: new Date(0), // Unix epoch — sorts to the bottom of the live feed
      });
      logger.info({ label: entry.hallOfShameLabel }, "Hall of Shame entry seeded");
    }

    logger.info(`Hall of Shame seeded: ${SEED_ENTRIES.length} entries`);
  } catch (err) {
    logger.error({ err }, "Failed to seed Hall of Shame");
  }
}
