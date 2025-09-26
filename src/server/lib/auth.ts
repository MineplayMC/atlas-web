import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";

import { db } from "@/db";
import configManager from "@/server/lib/config-manager";

let authInstance: ReturnType<typeof betterAuth> | null = null;

function createAuth() {
  const atlasConfig = configManager.getAtlasConfig();
  const oidcConfig = configManager.getOidcConfig();

  if (!atlasConfig || !oidcConfig) {
    throw new Error("Setup not completed - authentication not available");
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: true,
    }),
    baseURL: atlasConfig.baseUrl,
    secret: oidcConfig.secret,
    socialProviders: {
      discord: {
        clientId: oidcConfig.clientId,
        clientSecret: oidcConfig.clientSecret,
      },
      github: {
        clientId: oidcConfig.clientId,
        clientSecret: oidcConfig.clientSecret,
      },
      google: {
        clientId: oidcConfig.clientId,
        clientSecret: oidcConfig.clientSecret,
      },
    },
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "identity",
            clientId: oidcConfig.clientId,
            clientSecret: oidcConfig.clientSecret,
            authorizationUrl: oidcConfig.authorizationUrl,
            tokenUrl: oidcConfig.tokenUrl,
            userInfoUrl: oidcConfig.userInfoUrl,
            scopes: oidcConfig.scopes || [
              "openid",
              "profile",
              "email",
              "groups",
            ],
          },
        ],
      }),
    ],
  });
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(target, prop) {
    if (!authInstance) {
      authInstance = createAuth();
    }
    return (authInstance as any)[prop];
  },
});

export const resetAuth = () => {
  authInstance = null;
};
