import { defineConfig } from "drizzle-kit";

import configManager from "./src/server/lib/config-manager";

const buildConnectionString = () => {
  const postgresConfig = configManager.getPostgresConfig();
  if (postgresConfig) {
    return `postgresql://${postgresConfig.username}:${postgresConfig.password}@${postgresConfig.host}:${postgresConfig.port}/${postgresConfig.database}`;
  }

  return process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";
};

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: buildConnectionString(),
  },
});
