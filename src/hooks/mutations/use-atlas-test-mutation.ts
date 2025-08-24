import { useMutation } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useAtlasTestMutation = (
  onSuccess?: () => void,
  onError?: (_error: Error) => void
) => {
  return useMutation(
    orpc.setup.testAtlasConnection.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          onSuccess?.();
        } else {
          onError?.(new Error(data.message));
        }
      },
      onError: (error) => {
        onError?.(error);
      },
    })
  );
};
