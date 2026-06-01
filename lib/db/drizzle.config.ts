import { defineConfig } from "drizzle-kit";
import path from "path";

const migrationDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_DIRECT_URL ||
  process.env.DATABASE_URL;

if (!migrationDatabaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. For Neon schema pushes, prefer DATABASE_URL_UNPOOLED or DATABASE_DIRECT_URL.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: migrationDatabaseUrl,
  },
});
