export type TrustLevel = "trusted" | "caution" | "unknown" | "dangerous";
export type EntityCategory =
  | "DEX"
  | "Lending"
  | "NFT Marketplace"
  | "Bridge"
  | "Stablecoin"
  | "Wrapped Token"
  | "Derivatives"
  | "Yield"
  | "DAO"
  | "Oracle"
  | "Wallet / Multisig"
  | "Token"
  | "Mixer"
  | "Sanctioned"
  | "Exploiter";

export interface KnownEntity {
  name: string;
  category: EntityCategory;
  trustLevel: TrustLevel;
  url: string;
  description: string;
  logoLetter: string;
}

// Keyed by lowercase Ethereum address
const ENTITIES: Record<string, KnownEntity> = {
  // ─── Uniswap ────────────────────────────────────────────────────────────────
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { name: "Uniswap V2 Router",   category: "DEX",     trustLevel: "trusted", url: "https://uniswap.org", description: "Uniswap V2 swap router — largest DEX on Ethereum", logoLetter: "U" },
  "0xe592427a0aece92de3edee1f18e0157c05861564": { name: "Uniswap V3 Router",   category: "DEX",     trustLevel: "trusted", url: "https://uniswap.org", description: "Uniswap V3 swap router with concentrated liquidity", logoLetter: "U" },
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": { name: "Uniswap V3 Router 2", category: "DEX",     trustLevel: "trusted", url: "https://uniswap.org", description: "Uniswap V3 Universal Router (SwapRouter02)", logoLetter: "U" },
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": { name: "Uniswap Universal Router", category: "DEX", trustLevel: "trusted", url: "https://uniswap.org", description: "Uniswap Universal Router for V2 + V3 + NFT swaps", logoLetter: "U" },

  // ─── OpenSea ────────────────────────────────────────────────────────────────
  "0x00000000006c3852cbef3e08e8df289169ede581": { name: "OpenSea Seaport 1.1", category: "NFT Marketplace", trustLevel: "trusted", url: "https://opensea.io", description: "OpenSea Seaport protocol for NFT trading", logoLetter: "O" },
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": { name: "OpenSea Seaport 1.5", category: "NFT Marketplace", trustLevel: "trusted", url: "https://opensea.io", description: "OpenSea Seaport 1.5 — latest NFT marketplace protocol", logoLetter: "O" },
  "0x7f268357a8c2552623316e2562d90e642bb538e5": { name: "OpenSea Wyvern V2",   category: "NFT Marketplace", trustLevel: "trusted", url: "https://opensea.io", description: "OpenSea legacy Wyvern V2 exchange", logoLetter: "O" },

  // ─── Aave ───────────────────────────────────────────────────────────────────
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": { name: "Aave V2 Lending Pool",  category: "Lending", trustLevel: "trusted", url: "https://aave.com", description: "Aave V2 main lending and borrowing pool", logoLetter: "A" },
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": { name: "Aave V3 Pool",          category: "Lending", trustLevel: "trusted", url: "https://aave.com", description: "Aave V3 pool — multi-chain lending protocol", logoLetter: "A" },
  "0x2f39d218133afab8f2b819b1066c7e434ad94e9e": { name: "Aave V3 Pool Addresses Provider", category: "Lending", trustLevel: "trusted", url: "https://aave.com", description: "Aave V3 address provider contract", logoLetter: "A" },

  // ─── Compound ───────────────────────────────────────────────────────────────
  "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b": { name: "Compound Comptroller", category: "Lending", trustLevel: "trusted", url: "https://compound.finance", description: "Compound Finance protocol comptroller", logoLetter: "C" },
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { name: "WETH (Wrapped Ether)", category: "Wrapped Token", trustLevel: "trusted", url: "https://weth.io", description: "Wrapped Ether — ERC-20 version of ETH", logoLetter: "W" },

  // ─── Curve ──────────────────────────────────────────────────────────────────
  "0xd51a44d3fae010294c616388b506acda1bfaae46": { name: "Curve Tricrypto2",     category: "DEX",     trustLevel: "trusted", url: "https://curve.fi", description: "Curve Finance Tricrypto2 pool (USDT/WBTC/ETH)", logoLetter: "C" },
  "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7": { name: "Curve 3Pool",          category: "DEX",     trustLevel: "trusted", url: "https://curve.fi", description: "Curve 3Pool — DAI/USDC/USDT stable swap", logoLetter: "C" },
  "0xbabe61887f1de2713c6f97e567623453d3c79f67": { name: "Curve Factory",        category: "DEX",     trustLevel: "trusted", url: "https://curve.fi", description: "Curve Finance factory for new pools", logoLetter: "C" },

  // ─── 1inch ──────────────────────────────────────────────────────────────────
  "0x1111111254eeb25477b68fb85ed929f73a960582": { name: "1inch Aggregation Router V5", category: "DEX", trustLevel: "trusted", url: "https://1inch.io", description: "1inch DEX aggregator — finds best swap rates", logoLetter: "1" },
  "0x1111111254fb6c44bac0bed2854e76f90643097d": { name: "1inch Router V4",      category: "DEX",     trustLevel: "trusted", url: "https://1inch.io", description: "1inch V4 aggregation router", logoLetter: "1" },

  // ─── Lido ───────────────────────────────────────────────────────────────────
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": { name: "Lido stETH",           category: "Yield",   trustLevel: "trusted", url: "https://lido.fi", description: "Lido liquid staking — stake ETH and receive stETH", logoLetter: "L" },
  "0x889edc2edab5f40e902b864ad4d7ade8e412f9b1": { name: "Lido Withdrawal Queue", category: "Yield",  trustLevel: "trusted", url: "https://lido.fi", description: "Lido staking withdrawal queue contract", logoLetter: "L" },

  // ─── Balancer ───────────────────────────────────────────────────────────────
  "0xba12222222228d8ba445958a75a0704d566bf2c8": { name: "Balancer Vault",       category: "DEX",     trustLevel: "trusted", url: "https://balancer.fi", description: "Balancer V2 Vault — core contract for all pool interactions", logoLetter: "B" },

  // ─── MakerDAO ───────────────────────────────────────────────────────────────
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": { name: "MKR Token (MakerDAO)", category: "Token",   trustLevel: "trusted", url: "https://makerdao.com", description: "MakerDAO governance token — manages DAI stablecoin", logoLetter: "M" },
  "0x6b175474e89094c44da98b954eedeac495271d0f": { name: "DAI Stablecoin",       category: "Stablecoin", trustLevel: "trusted", url: "https://makerdao.com", description: "DAI — decentralized USD stablecoin by MakerDAO", logoLetter: "D" },
  "0x5ef30b9986345249bc32d8928b7ee64de9435e39": { name: "MakerDAO CDP Manager", category: "Lending", trustLevel: "trusted", url: "https://makerdao.com", description: "MakerDAO Collateralized Debt Position manager", logoLetter: "M" },

  // ─── USDC / Circle ──────────────────────────────────────────────────────────
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { name: "USDC (Circle)",        category: "Stablecoin", trustLevel: "trusted", url: "https://www.circle.com", description: "USD Coin — regulated stablecoin issued by Circle", logoLetter: "U" },

  // ─── USDT / Tether ──────────────────────────────────────────────────────────
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { name: "USDT (Tether)",        category: "Stablecoin", trustLevel: "trusted", url: "https://tether.to", description: "Tether USD — largest stablecoin by market cap", logoLetter: "T" },

  // ─── Chainlink ──────────────────────────────────────────────────────────────
  "0x514910771af9ca656af840dff83e8264ecf986ca": { name: "LINK Token (Chainlink)", category: "Oracle", trustLevel: "trusted", url: "https://chain.link", description: "Chainlink token — powers the decentralized oracle network", logoLetter: "C" },
  "0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf": { name: "Chainlink Feed Registry", category: "Oracle", trustLevel: "trusted", url: "https://chain.link", description: "Chainlink on-chain price feed registry", logoLetter: "C" },

  // ─── GMX ────────────────────────────────────────────────────────────────────
  "0x489ee077994b6658eafa855c308275ead8097c4a": { name: "GMX Vault",            category: "Derivatives", trustLevel: "trusted", url: "https://gmx.io", description: "GMX perpetual DEX vault on Arbitrum/Avalanche", logoLetter: "G" },

  // ─── Safe (Gnosis Safe) ──────────────────────────────────────────────────────
  "0xd9db270c1b5e3bd161e8c8503c55ceabee709552": { name: "Gnosis Safe 1.3",      category: "Wallet / Multisig", trustLevel: "trusted", url: "https://safe.global", description: "Gnosis Safe multisig — most popular smart contract wallet", logoLetter: "S" },
  "0x41675c099f32341bf84bfc5382af534df5c7461a": { name: "Safe Proxy Factory 1.4", category: "Wallet / Multisig", trustLevel: "trusted", url: "https://safe.global", description: "Safe (Gnosis Safe) proxy factory contract", logoLetter: "S" },

  // ─── Stargate / LayerZero Bridge ────────────────────────────────────────────
  "0x8731d54e9d02c286767d56ac03e8037c07e01e98": { name: "Stargate Router",      category: "Bridge",  trustLevel: "trusted", url: "https://stargate.finance", description: "Stargate Finance cross-chain bridge router", logoLetter: "S" },

  // ─── Blur ───────────────────────────────────────────────────────────────────
  "0x000000000000ad05ccc4f10045630fb830b95127": { name: "Blur Marketplace",     category: "NFT Marketplace", trustLevel: "trusted", url: "https://blur.io", description: "Blur — pro NFT marketplace for traders", logoLetter: "B" },

  // ─── ENS ────────────────────────────────────────────────────────────────────
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85": { name: "ENS: BaseRegistrarImplementation", category: "DAO", trustLevel: "trusted", url: "https://ens.domains", description: "Ethereum Name Service — .eth domain registrar", logoLetter: "E" },
  "0x283af0b28c62c092c9727f1ee09c02ca627eb7f5": { name: "ENS: ETHRegistrarController", category: "DAO", trustLevel: "trusted", url: "https://ens.domains", description: "ENS .eth domain registration controller", logoLetter: "E" },

  // ─── ⚠ OFAC-SANCTIONED: Tornado Cash ────────────────────────────────────────
  // US Treasury sanctioned these contracts on August 8, 2022 under EO 13694.
  // Used to launder $7.6B+ including $455M stolen by North Korea's Lazarus Group.
  // US persons are legally prohibited from interacting with any of these contracts.
  "0xa160cdab225685da1d56aa342ad8841c3b53f291": { name: "Tornado Cash: ETH 100 Pool",  category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned cryptocurrency mixer (ETH 100-denomination pool). Sanctioned by the US Treasury on August 8, 2022. Used to launder $7.6B+ in cryptocurrency, including $455M stolen by North Korea's Lazarus Group. Interacting with this contract may violate OFAC sanctions law.", logoLetter: "!" },
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": { name: "Tornado Cash: ETH 10 Pool",   category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned cryptocurrency mixer (ETH 10-denomination pool). Sanctioned by the US Treasury on August 8, 2022. Facilitates anonymous ETH transfers used for money laundering. US persons are prohibited from interacting with this contract.", logoLetter: "!" },
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": { name: "Tornado Cash: ETH 1 Pool",    category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned cryptocurrency mixer (ETH 1-denomination pool). Sanctioned by the US Treasury on August 8, 2022. Part of the Tornado Cash protocol used to launder billions in stolen cryptocurrency.", logoLetter: "!" },
  "0x12d66f87a04a9e220c9d0d3e79a4b48a3e74f7a3": { name: "Tornado Cash: ETH 0.1 Pool",  category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned cryptocurrency mixer (ETH 0.1-denomination pool). Sanctioned by the US Treasury on August 8, 2022. Part of the Tornado Cash protocol on the OFAC SDN list.", logoLetter: "!" },
  "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3": { name: "Tornado Cash: DAI Pool",       category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned Tornado Cash DAI stablecoin mixing pool. Sanctioned by the US Treasury on August 8, 2022.", logoLetter: "!" },
  "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144": { name: "Tornado Cash: cDAI Pool",      category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned Tornado Cash Compound DAI (cDAI) mixing pool. Sanctioned by the US Treasury on August 8, 2022.", logoLetter: "!" },
  "0x07687e702b410fa43f4cb4af7fa097918ffd2730": { name: "Tornado Cash: WBTC Pool",      category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned Tornado Cash Wrapped Bitcoin (WBTC) mixing pool. Sanctioned by the US Treasury on August 8, 2022.", logoLetter: "!" },
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": { name: "Tornado Cash: Router",         category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned Tornado Cash main router contract. All deposits and withdrawals pass through this contract. Sanctioned by the US Treasury on August 8, 2022.", logoLetter: "!" },
  "0x5efda50f22d34f262c29268506c5fa42cb56a1ce": { name: "Tornado Cash: Governance",     category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned Tornado Cash governance contract. Controls protocol parameters and upgrades. Sanctioned by the US Treasury on August 8, 2022.", logoLetter: "!" },
  "0x527653ea119f3e6a1f5bd18fbf4714081d7b31ce": { name: "Tornado Cash: TreeUpdater",    category: "Mixer", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808", description: "OFAC-sanctioned Tornado Cash Merkle tree updater contract used for privacy proofs. Sanctioned by the US Treasury on August 8, 2022.", logoLetter: "!" },

  // ─── ⚠ Known Exploiters / Attackers ─────────────────────────────────────────
  "0xb66cd966670d962c227b3eaba30a872dbfb995db": { name: "Euler Finance Attacker",       category: "Exploiter", trustLevel: "dangerous", url: "https://etherscan.io/address/0xb66cd966670d962c227b3eaba30a872dbfb995db", description: "Address that executed the Euler Finance flash loan attack on March 13, 2023. Stole $197M across multiple assets (DAI, USDC, stETH, WBTC) using a donation/liquidation exploit in Euler's donateToReserves function.", logoLetter: "!" },
  "0x05328f171b8c1463eafdacca478d9ee6a1d923f8": { name: "Nomad Bridge Exploiter",       category: "Exploiter", trustLevel: "dangerous", url: "https://etherscan.io/address/0x05328f171b8c1463eafdacca478d9ee6a1d923f8", description: "One of many addresses that drained the Nomad cross-chain bridge in August 2022 using a merkle root initialization bug. Over $190M was stolen in a copy-cat free-for-all exploit.", logoLetter: "!" },
  "0x9f26dc6e954072a8701f2af71db4f6b285b7ee8f": { name: "Lazarus Group (DPRK) Wallet",  category: "Sanctioned", trustLevel: "dangerous", url: "https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220414", description: "Wallet associated with North Korea's state-sponsored Lazarus Group hacking organization, sanctioned by OFAC. Lazarus Group stole $455M via Tornado Cash and $625M from the Axie Infinity Ronin Bridge.", logoLetter: "!" },
};

export function lookupEntity(address: string): KnownEntity | null {
  return ENTITIES[address.toLowerCase()] ?? null;
}

export function lookupEntitiesByAddresses(addresses: string[]): KnownEntity | null {
  for (const addr of addresses) {
    const entity = lookupEntity(addr);
    if (entity) return entity;
  }
  return null;
}
