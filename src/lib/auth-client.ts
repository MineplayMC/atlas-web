import { createIsomorphicFn } from "@tanstack/react-start";
import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { authQueryOptions } from "@/features/auth/services/auth.query";
import configManager from "@/server/lib/config-manager";

const getBaseURL = createIsomorphicFn()
  .client(() => window.location.origin)
  .server(
    () => configManager.getAtlasConfig()?.baseUrl || "http://localhost:3000"
  );

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  fetchOptions: {
    // https://discord.com/channels/1288403910284935179/1288403910284935182/1311199374793244703
    onResponse: async () => {
      await window.getQueryClient().invalidateQueries(authQueryOptions());
      await window.getRouter().invalidate();
    },
  },
  plugins: [genericOAuthClient(), adminClient()],
});
