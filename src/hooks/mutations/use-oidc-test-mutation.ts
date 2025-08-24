import { useMutation } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useOidcTestMutation = (
  onSuccess?: () => void,
  onError?: (_error: Error) => void
) => {
  return useMutation(
    orpc.setup.testOidcConnection.mutationOptions({
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
