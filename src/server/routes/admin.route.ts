import { ORPCError, os } from "@orpc/server";
import fs from "fs";
import path from "path";
import postgres from "postgres";
import { z } from "zod";

import { reconnectDatabase } from "@/db";
import { createAtlasClient } from "@/server/lib/atlas-api/atlas-api.client";
import { resetAuth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

const CONFIG_DIR = path.join(process.cwd(), "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

const getConfig = os.handler(async () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      throw new ORPCError("NOT_FOUND", {
        message: "Configuration file not found",
      });
    }

    const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(configData);

    return {
      postgresConfig: {
        host: config.postgresConfig?.host,
        port: config.postgresConfig?.port,
        database: config.postgresConfig?.database,
        username: config.postgresConfig?.username,
      },
      oidcConfig: {
        provider: config.oidcConfig?.provider,
        providerName: config.oidcConfig?.providerName,
        clientId: config.oidcConfig?.clientId,
        authorizationUrl: config.oidcConfig?.authorizationUrl,
        tokenUrl: config.oidcConfig?.tokenUrl,
        userInfoUrl: config.oidcConfig?.userInfoUrl,
        scopes: config.oidcConfig?.scopes,
      },
      atlasConfig: {
        baseUrl: config.atlasConfig?.baseUrl,
        atlasUrl: config.atlasConfig?.atlasUrl,
        websocketUrl: config.atlasConfig?.websocketUrl,
      },
      brandingConfig: config.brandingConfig,
    };
  } catch (error) {
    throw new ORPCError("INTERNAL_ERROR", {
      message: `Failed to read configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
});

const updateDatabaseConfig = os
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
      ensureConfigDir();

      if (!fs.existsSync(CONFIG_FILE)) {
        throw new ORPCError("NOT_FOUND", {
          message: "Configuration file not found",
        });
      }

      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(configData);

      config.postgresConfig = {
        ...config.postgresConfig,
        ...input,
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");

      configManager.invalidateCache();
      await reconnectDatabase();

      return {
        success: true,
        message: "Database configuration updated successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to update database configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const updateAuthConfig = os
  .input(
    z.object({
      provider: z.string(),
      providerName: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      authorizationUrl: z.string(),
      tokenUrl: z.string(),
      userInfoUrl: z.string(),
      scopes: z.array(z.string()).optional(),
    })
  )
  .handler(async ({ input }) => {
    try {
      ensureConfigDir();

      if (!fs.existsSync(CONFIG_FILE)) {
        throw new ORPCError("NOT_FOUND", {
          message: "Configuration file not found",
        });
      }

      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(configData);

      config.oidcConfig = {
        ...config.oidcConfig,
        ...input,
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");

      configManager.invalidateCache();
      resetAuth();

      return {
        success: true,
        message: "Authentication configuration updated successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to update authentication configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const updateAtlasConfig = os
  .input(
    z.object({
      baseUrl: z.string(),
      atlasUrl: z.string(),
      atlasApiKey: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
      ensureConfigDir();

      if (!fs.existsSync(CONFIG_FILE)) {
        throw new ORPCError("NOT_FOUND", {
          message: "Configuration file not found",
        });
      }

      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(configData);

      const websocketUrl = input.atlasUrl
        .replace(/^https:\/\//, "wss://")
        .replace(/^http:\/\//, "ws://");

      config.atlasConfig = {
        ...config.atlasConfig,
        ...input,
        websocketUrl,
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");

      configManager.invalidateCache();

      return {
        success: true,
        message: "Atlas API configuration updated successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to update Atlas API configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const updateBrandingConfig = os
  .input(
    z.object({
      displayName: z.string(),
      logo: z.string().optional(),
      primaryColor: z.string(),
      backgroundImage: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    try {
      ensureConfigDir();

      if (!fs.existsSync(CONFIG_FILE)) {
        throw new ORPCError("NOT_FOUND", {
          message: "Configuration file not found",
        });
      }

      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(configData);

      config.brandingConfig = {
        ...config.brandingConfig,
        ...input,
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");

      configManager.invalidateCache();

      return {
        success: true,
        message: "Branding configuration updated successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to update branding configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const testDatabaseConnection = os
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

const testAtlasConnection = os
  .input(
    z.object({
      baseUrl: z.string(),
      apiKey: z.string(),
    })
  )
  .handler(async ({ input }) => {
    try {
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
  getConfig,
  updateDatabaseConfig,
  updateAuthConfig,
  updateAtlasConfig,
  updateBrandingConfig,
  testDatabaseConnection,
  testOidcConnection,
  testAtlasConnection,
};