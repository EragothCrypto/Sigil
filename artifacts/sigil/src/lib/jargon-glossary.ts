/**
 * Sigil — Jargon Glossary
 * Plain-English definitions for Web3 / blockchain technical terms.
 * Displayed as inline tooltips throughout the UI.
 *
 * Key: the canonical term (case-insensitive matching).
 * Value: one plain-English sentence shown in the tooltip.
 */
export const JARGON_GLOSSARY: Record<string, string> = {

  // ── Approvals ──────────────────────────────────────────────────────────────
  "setApprovalForAll":    "Grants a contract permission to transfer every NFT in a collection from your wallet — one of the most dangerous approvals you can sign.",
  "approve":              "Grants a contract permission to spend a specific token from your wallet on your behalf.",
  "increaseAllowance":    "Raises the amount a contract is allowed to spend from your wallet without a new approval.",
  "allowance":            "The maximum amount of a token that a contract is currently permitted to transfer from your wallet.",
  "token approval":       "Permission you grant a smart contract to move tokens out of your wallet — a core but risky DeFi mechanic.",
  "unlimited approval":   "Sets your spending permission to the maximum possible value (~infinite), meaning the contract can take any amount of that token from you at any time.",
  "infinite approval":    "Sets your spending permission to the maximum possible value (~infinite), meaning the contract can take any amount of that token from you at any time.",
  "revoke":               "Removes a previously granted spending permission, protecting your wallet from future misuse by that contract.",

  // ── Standards ─────────────────────────────────────────────────────────────
  "EIP-712":              "A standard that lets wallets show you readable, human-friendly information about what you're signing instead of raw hex bytes.",
  "EIP-2612":             "A permit standard that lets you approve token spending with a signature (no gas fee) instead of an on-chain transaction.",
  "permit":               "A gasless token approval mechanism — you sign a message off-chain instead of submitting a transaction.",
  "ERC-20":               "The most common token standard on Ethereum — covers coins like USDC, DAI, and LINK.",
  "ERC-721":              "The NFT standard — each token is unique and non-interchangeable.",
  "ERC-1155":             "A multi-token standard that supports both fungible (coin-like) and non-fungible (NFT-like) tokens in one contract.",

  // ── Transaction fields ────────────────────────────────────────────────────
  "gas":                  "The fee paid to the Ethereum network to process your transaction — higher fees mean faster confirmation.",
  "gas fee":              "The fee paid to the Ethereum network to process your transaction — higher fees mean faster confirmation.",
  "gas limit":            "The maximum amount of computation work you're willing to pay for; if the transaction needs more, it fails and you still pay.",
  "gas price":            "How much you're willing to pay per unit of gas, measured in gwei — higher means miners prioritize your transaction.",
  "gwei":                 "A unit of Ether — 1 ETH = 1,000,000,000 gwei. Gas prices are usually quoted in gwei.",
  "nonce":                "A sequential counter tracking how many transactions your wallet has sent; prevents the same transaction from being submitted twice.",
  "calldata":             "The encoded instructions bundled in a transaction telling the smart contract which function to run and with what inputs.",
  "method selector":      "A 4-byte code derived from a function name that tells the contract which function to call — like a short address for each action.",
  "function selector":    "A 4-byte code derived from a function name that tells the contract which function to call — like a short address for each action.",
  "tx hash":              "The unique fingerprint of a transaction — a 66-character string you can look up on a block explorer like Etherscan.",
  "transaction hash":     "The unique fingerprint of a transaction — a 66-character string you can look up on a block explorer like Etherscan.",
  "block number":         "The sequential ID of the block that included your transaction — each new block is mined roughly every 12 seconds on Ethereum.",
  "value":                "The amount of ETH (in wei) sent along with the transaction — separate from any token transfers happening inside the contract call.",

  // ── Contracts ─────────────────────────────────────────────────────────────
  "smart contract":       "Self-executing code deployed on the blockchain — it runs automatically when specific conditions are met, with no middleman.",
  "proxy contract":       "A contract that delegates its actual logic to a separate implementation contract, allowing the logic to be upgraded without changing the contract address.",
  "implementation contract": "The contract holding the real logic behind a proxy — it can be replaced to change the contract's behavior.",
  "bytecode":             "The compiled machine code of a smart contract as it lives on the blockchain — unreadable without the source code.",
  "ABI":                  "Application Binary Interface: a specification describing all the functions a smart contract exposes and how to call them.",
  "verified source":      "Source code that has been published on Etherscan and confirmed to exactly match the deployed bytecode — you can read what it does.",
  "unverified contract":  "A contract whose source code has not been published — you cannot see what it does, which is a major red flag.",
  "self-destruct":        "A function that permanently destroys a contract and sends its balance elsewhere — a rug pull vector.",
  "mint":                 "Creating new tokens — if unrestricted, a malicious owner could inflate supply and crash the token value.",

  // ── Networks ──────────────────────────────────────────────────────────────
  "mainnet":              "The live Ethereum blockchain where transactions use real money — as opposed to testnets.",
  "testnet":              "A test version of the blockchain using fake ETH — used by developers before deploying to mainnet.",

  // ── Security patterns ─────────────────────────────────────────────────────
  "drainer":              "A malicious contract or signature designed to immediately empty your wallet of tokens and NFTs.",
  "wallet drainer":       "A malicious contract or signature designed to immediately empty your wallet of tokens and NFTs.",
  "honeypot":             "A token contract that lets you buy but prevents you from selling — trapping your funds.",
  "rug pull":             "When developers abandon a project and drain the liquidity pool, leaving investors with worthless tokens.",
  "phishing":             "Tricking users into signing malicious transactions through fake websites or impersonated protocols.",
  "front-running":        "When someone sees your pending transaction and submits a higher-fee transaction to execute before yours, profiting from the price movement.",
  "sandwich attack":      "A type of front-running where your swap is surrounded by two attacker transactions to extract value from your trade.",
  "flash loan":           "A type of uncollateralized loan that must be borrowed and repaid within the same transaction — often used to exploit protocol vulnerabilities.",
};

/** Returns the definition for a term (case-insensitive), or undefined. */
export function lookupJargon(term: string): string | undefined {
  const lower = term.toLowerCase();
  for (const [key, value] of Object.entries(JARGON_GLOSSARY)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}
