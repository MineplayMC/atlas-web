import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";

import { db } from "@/db";
import configManager from "@/server/lib/config-manager";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  baseURL: configManager.getAtlasConfig()?.baseUrl!,
  secret: configManager.getOidcConfig()?.secret!,
  // emailAndPassword: {
  //   enabled: true,
  // },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["identity"],
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "identity",
          clientId: configManager.getOidcConfig()?.clientId!,
          clientSecret: configManager.getOidcConfig()?.clientSecret!,
          authorizationUrl: configManager.getOidcConfig()?.authorizationUrl!,
          tokenUrl: configManager.getOidcConfig()?.tokenUrl!,
          userInfoUrl: configManager.getOidcConfig()?.userInfoUrl!,
          scopes: ["openid", "profile", "email", "groups"],
        },
      ],
    }),
  ],
});
