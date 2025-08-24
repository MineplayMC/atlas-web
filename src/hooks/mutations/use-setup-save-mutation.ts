import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setupStatusQueryOptions } from "@/hooks/queries/use-setup-status-query";
import { orpc } from "@/lib/orpc";

export const useSetupSaveMutation = (
  onSuccess?: () => void,
  onError?: (_error: Error) => void
) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.setup.saveSetupConfig.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(setupStatusQueryOptions());
        onSuccess?.();
      },
      onError: (error) => {
        onError?.(error);
      },
    })
  );
};
