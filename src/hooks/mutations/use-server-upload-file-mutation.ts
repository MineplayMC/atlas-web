import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { useUploadProgress } from "@/contexts/upload-progress-context";

interface UploadParams {
  server: string;
  path: string;
  file: File;
}

export const useServerUploadFileMutation = (
  serverId: string,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { addUpload, updateUpload } = useUploadProgress();

  return useMutation({
    mutationFn: async ({ server, path, file }: UploadParams) => {
      const uploadId = addUpload({
        fileName: file.name,
        filePath: path,
        serverId: server,
        progress: 0,
        status: "uploading",
      });

      try {
        // Always use regular upload
        const response = await axios.post(
          `/api/upload?serverId=${encodeURIComponent(server)}&path=${encodeURIComponent(path)}`,
          file,
          {
            timeout: 10 * 60 * 1000,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress =
                  (progressEvent.loaded / progressEvent.total) * 100;
                updateUpload(uploadId, { progress: Math.round(progress) });
              }
            },
            headers: { "Content-Type": "application/octet-stream" },
          }
        );

        updateUpload(uploadId, {
          progress: 100,
          status: "completed",
        });

        return response.data;
      } catch (error) {
        updateUpload(uploadId, {
          status: "error",
          error: axios.isAxiosError(error)
            ? error.response?.data || error.message
            : "Upload failed",
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onSuccess?.();
    },
  });
};
