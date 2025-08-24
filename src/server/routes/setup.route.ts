import { ORPCError, os } from "@orpc/server";
import { randomBytes } from "crypto";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import fs from "fs";
import path from "path";
import postgres from "postgres";
import { z } from "zod";

import { reconnectDatabase } from "@/db";
import { createAtlasClient } from "@/server/lib/atlas-api/atlas-api.client";
import { resetAuth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

import packageJson from "../../../package.json";

const setupConfigSchema = z.object({
  postgresConfig: z.object({
    host: z.string(),
    port: z.number(),
    database: z.string(),
    username: z.string(),
    password: z.string(),
  }),
  oidcConfig: z.object({
    provider: z.string(),
    providerName: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    authorizationUrl: z.string(),
    tokenUrl: z.string(),
    userInfoUrl: z.string(),
  }),
  atlasConfig: z.object({
    baseUrl: z.string(),
    atlasUrl: z.string(),
    atlasApiKey: z.string(),
  }),
  brandingConfig: z.object({
    displayName: z.string(),
    logo: z.string().optional(),
    primaryColor: z.string(),
    backgroundImage: z.string().optional(),
  }),
});

const CONFIG_DIR = path.join(process.cwd(), "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

const getSetupStatus = os.handler(async () => {
  try {
    const configExists = fs.existsSync(CONFIG_FILE);

    if (!configExists) {
      return {
        isCompleted: false,
        config: null,
      };
    }

    const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(configData);

    const convertToHslValues = (color: string): string => {
      const hslMatch = color.match(/(\d+),\s*(\d+)%,\s*(\d+)%/);
      if (hslMatch) {
        return `${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%`;
      }

      if (color.startsWith("#")) {
        const hex = color.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s;
        const l = (max + min) / 2;

        if (max === min) {
          h = s = 0; // achromatic
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
            default:
              h = 0;
          }
          h /= 6;
        }

        return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
      }

      return "30, 56%, 65%";
    };

    const publicConfig = {
      oidcConfig: {
        providerName: config.oidcConfig?.providerName,
      },
      atlasConfig: {
        baseUrl: config.atlasConfig?.baseUrl,
        atlasUrl: config.atlasConfig?.atlasUrl,
        websocketUrl: config.atlasConfig?.websocketUrl,
      },
      brandingConfig: {
        ...config.brandingConfig,
        primaryColor: convertToHslValues(
          config.brandingConfig?.primaryColor || "#FF6A3D"
        ),
      },
      completedAt: config.completedAt,
      version: config.version,
    };

    return {
      isCompleted: true,
      config: publicConfig,
    };
  } catch (error) {
    return {
      isCompleted: false,
      config: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

const saveSetupConfig = os
  .input(setupConfigSchema)
  .handler(async ({ input }) => {
    try {
      ensureConfigDir();

      const secret =
        process.env.BETTER_AUTH_SECRET || randomBytes(32).toString("base64");

      const websocketUrl = input.atlasConfig.atlasUrl
        .replace(/^https:\/\//, "wss://")
        .replace(/^http:\/\//, "ws://");

      const configWithTimestamp = {
        ...input,
        oidcConfig: {
          ...input.oidcConfig,
          secret,
        },
        atlasConfig: {
          ...input.atlasConfig,
          websocketUrl,
        },
        completedAt: new Date().toISOString(),
        version: packageJson.version,
      };

      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(configWithTimestamp, null, 2),
        "utf-8"
      );

      configManager.invalidateCache();
      resetAuth();

      const newDb = await reconnectDatabase();

      await migrate(newDb, { migrationsFolder: "./drizzle/migrations" });

      return {
        success: true,
        message: "Setup configuration saved successfully",
        config: configWithTimestamp,
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to save setup configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const testOidcConnection = os
  .input(
    z.object({
      provider: z.string(),
      authorizationUrl: z.string(),
      tokenUrl: z.string(),
      userInfoUrl: z.string(),
      clientId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const configExists = fs.existsSync(CONFIG_FILE);
      if (configExists) {
        const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
        const config = JSON.parse(configData);
        if (config.completedAt) {
          throw new ORPCError("FORBIDDEN", {
            message:
              "Setup has already been completed. Cannot test OIDC connection.",
          });
        }
      }

      const urls = [input.authorizationUrl, input.tokenUrl, input.userInfoUrl];

      const testPromises = urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(3000),
          });
          return { url, reachable: response.status < 500 };
        } catch {
          return { url, reachable: false };
        }
      });

      const results = await Promise.all(testPromises);
      const unreachableUrls = results.filter((r) => !r.reachable);

      if (unreachableUrls.length > 0) {
        return {
          success: false,
          message: `Unable to reach: ${unreachableUrls.map((r) => r.url).join(", ")}`,
        };
      }

      return {
        success: true,
        message: "OIDC configuration validated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown OIDC validation error",
      };
    }
  });

const testPostgresConnection = os
  .input(
    z.object({
      host: z.string(),
      port: z.number(),
      database: z.string(),
      username: z.string(),
      password: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const configExists = fs.existsSync(CONFIG_FILE);
      if (configExists) {
        const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
        const config = JSON.parse(configData);
        if (config.completedAt) {
          throw new ORPCError("FORBIDDEN", {
            message:
              "Setup has already been completed. Cannot test database connection.",
          });
        }
      }

      const sql = postgres({
        host: input.host,
        port: input.port,
        database: input.database,
        username: input.username,
        password: input.password,
        connect_timeout: 3,
        idle_timeout: 2,
        max: 1,
      });

      await sql`SELECT 1`;
      await sql.end();

      return {
        success: true,
        message: "Database connection successful",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown database error",
      };
    }
  });

const testAtlasConnection = os
  .input(
    z.object({
      baseUrl: z.string(),
      apiKey: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      const configExists = fs.existsSync(CONFIG_FILE);
      if (configExists) {
        const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
        const config = JSON.parse(configData);
        if (config.completedAt) {
          throw new ORPCError("FORBIDDEN", {
            message:
              "Setup has already been completed. Cannot test Atlas connection.",
          });
        }
      }

      const atlasClient = createAtlasClient(input.baseUrl, input.apiKey);
      const status = await atlasClient.getStatus();

      return {
        success: true,
        message: "Atlas API connection successful",
        data: status,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown Atlas API error",
      };
    }
  });

export default {
  getSetupStatus,
  saveSetupConfig,
  testPostgresConnection,
  testOidcConnection,
  testAtlasConnection,
};
