import { useSuspenseQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export interface SetupStatusResponse {
  isCompleted: boolean;
  config: {
    oidcConfig: {
      providerName: string;
      provider: string;
    };
    atlasConfig: {
      baseUrl: string;
      atlasUrl: string;
      websocketUrl: string;
    };
    brandingConfig: {
      displayName: string;
      logo?: string;
      primaryColor: string;
      backgroundImage?: string;
    };
    completedAt: string;
    version: string;
  } | null;
  error?: string;
}

export const setupStatusQueryOptions = () =>
  orpc.setup.getSetupStatus.queryOptions();

export const useSetupStatusQuery = () => {
  return useSuspenseQuery(setupStatusQueryOptions());
};
