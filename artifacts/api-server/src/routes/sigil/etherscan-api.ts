export function getEtherscanApiKey(): string {
  const apiKey = process.env.ETHERSCAN_API_KEY?.trim();

  if (!apiKey || apiKey === "YourApiKeyToken") {
    throw new Error("ETHERSCAN_API_KEY is required for Etherscan API calls");
  }

  return apiKey;
}
