import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const candidateDirs = [
  process.cwd(),
  path.resolve(dirname, "..", "..", ".."),
  path.resolve(dirname, "..", "..", "..", ".."),
];

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return null;

  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (!key) return null;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

for (const dir of candidateDirs) {
  loadEnvFile(path.join(dir, ".env"));
  loadEnvFile(path.join(dir, ".env.local"));
}

export const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "AI_INTEGRATIONS_OPENAI_BASE_URL",
  "AI_INTEGRATIONS_OPENAI_API_KEY",
] as const;

export const DEFAULT_SIGIL_AI_MODEL = "deepseek/deepseek-v4-flash:free";

export function getSigilAiModel(): string {
  return process.env.SIGIL_AI_MODEL || DEFAULT_SIGIL_AI_MODEL;
}

export function getMissingRequiredEnv(): string[] {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
}

export function assertRequiredEnv() {
  const missing = getMissingRequiredEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing required Sigil environment variables: ${missing.join(", ")}. ` +
        "Set them in Vercel Project Settings or copy .env.example to .env for local development.",
    );
  }
}
