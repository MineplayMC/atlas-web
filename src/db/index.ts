import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import configManager from "@/server/lib/config-manager";

import * as schema from "./schema";

const connectionOptions = {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  statement_timeout: 5000,
  max_lifetime: 60 * 30,
};

const queryClientPropertyName = "__prevent-name-collision__postgres";
const queryClientInstanceName = "__prevent-name-collision__postgres_instance";
type GlobalThisWithPostgres = typeof globalThis & {
  [queryClientPropertyName]?: postgres.Sql<{}>;
  [queryClientInstanceName]?: ReturnType<typeof drizzle>;
};

const buildConnectionString = () => {
  const postgresConfig = configManager.getPostgresConfig();
  if (postgresConfig) {
    return `postgresql://${postgresConfig.username}:${postgresConfig.password}@${postgresConfig.host}:${postgresConfig.port}/${postgresConfig.database}`;
  }
  return process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";
};

const getDrizzle = () => {
  const connectionString = buildConnectionString();

  if (process.env.NODE_ENV === "production") {
    return postgres(connectionString, connectionOptions);
  } else {
    const newGlobalThis = globalThis as GlobalThisWithPostgres;
    if (!newGlobalThis[queryClientPropertyName]) {
      newGlobalThis[queryClientPropertyName] = postgres(
        connectionString,
        connectionOptions
      );
    }
    return newGlobalThis[queryClientPropertyName];
  }
};

const getDrizzleInstance = () => {
  if (process.env.NODE_ENV === "production") {
    return drizzle({ client: getDrizzle(), schema });
  } else {
    const newGlobalThis = globalThis as GlobalThisWithPostgres;
    if (!newGlobalThis[queryClientInstanceName]) {
      newGlobalThis[queryClientInstanceName] = drizzle({
        client: getDrizzle(),
        schema,
      });
    }
    return newGlobalThis[queryClientInstanceName];
  }
};

export const reconnectDatabase = async () => {
  const newGlobalThis = globalThis as GlobalThisWithPostgres;

  if (newGlobalThis[queryClientPropertyName]) {
    await newGlobalThis[queryClientPropertyName].end();
    delete newGlobalThis[queryClientPropertyName];
    delete newGlobalThis[queryClientInstanceName];
  }

  return getDrizzleInstance();
};

export const db = getDrizzleInstance();
