import { ORPCError, os } from "@orpc/server";
import fs from "fs";
import path from "path";
import postgres from "postgres";
import { z } from "zod";
import { getWebRequest } from "@tanstack/react-start/server";

import { reconnectDatabase } from "@/db";
import { createAtlasClient } from "@/server/lib/atlas-api/atlas-api.client";
import { auth, resetAuth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

const CONFIG_DIR = path.join(process.cwd(), "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

async function requireAdmin() {
  const request = getWebRequest();

  const session = await auth.api.getSession({
    headers: request?.headers ?? new Headers(),
  });

  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Authentication required",
    });
  }

  // Use Better Auth admin API - try to access admin function to check permissions
  try {
    await (auth.api as any).listUsers({
      headers: request?.headers ?? new Headers(),
      query: {},
    });
  } catch {
    throw new ORPCError("FORBIDDEN", {
      message: "Admin role required",
    });
  }

  return session.user;
}

const getConfig = os.handler(async () => {
  await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();

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
      favicon: z.string().optional(),
      primaryColor: z.string(),
      backgroundImage: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();

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

const listUsers = os.handler(async () => {
  const request = getWebRequest();

  try {
    // Use Better Auth admin API to list users
    const result = await (auth.api as any).listUsers({
      headers: request?.headers ?? new Headers(),
      query: {},
    });

    // Better Auth might return the users in a nested property
    const users = Array.isArray(result) ? result : result?.users || [];

    return users;
  } catch (error) {
    throw new ORPCError("INTERNAL_ERROR", {
      message: `Failed to fetch users: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
});

const updateUserRole = os
  .input(
    z.object({
      userId: z.string(),
      role: z.string(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();
    const request = getWebRequest();

    try {
      await (auth.api as any).setRole({
        headers: request?.headers ?? new Headers(),
        body: {
          userId: input.userId,
          role: input.role,
        },
      });

      return {
        success: true,
        message: "User role updated successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to update user role: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const banUser = os
  .input(
    z.object({
      userId: z.string(),
      reason: z.string().optional(),
      expiresAt: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();
    const request = getWebRequest();

    try {
      await (auth.api as any).banUser({
        headers: request?.headers ?? new Headers(),
        body: {
          userId: input.userId,
          reason: input.reason,
          expiresAt: input.expiresAt,
        },
      });

      return {
        success: true,
        message: "User banned successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to ban user: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const unbanUser = os
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();
    const request = getWebRequest();

    try {
      await (auth.api as any).unbanUser({
        headers: request?.headers ?? new Headers(),
        body: {
          userId: input.userId,
        },
      });

      return {
        success: true,
        message: "User unbanned successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to unban user: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

const deleteUser = os
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();
    const request = getWebRequest();

    try {
      await (auth.api as any).removeUser({
        headers: request?.headers ?? new Headers(),
        body: {
          userId: input.userId,
        },
      });

      return {
        success: true,
        message: "User deleted successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: `Failed to delete user: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
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
  listUsers,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
};