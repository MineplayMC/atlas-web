import {
  type SetupStatusResponse,
  useSetupStatusQuery,
} from "./queries/use-setup-status-query";

export const useSetupStatus = () => {
  const { data, isLoading, error } = useSetupStatusQuery();

  return {
    isCompleted: data?.isCompleted ?? false,
    config: data?.config ?? null,
    isLoading,
    error,
  } as {
    isCompleted: boolean;
    config: SetupStatusResponse["config"];
    isLoading: boolean;
    error: any;
  };
};
