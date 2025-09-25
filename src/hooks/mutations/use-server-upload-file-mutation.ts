import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { useUploadProgress } from "@/contexts/upload-progress-context";

interface UploadParams {
  server: string;
  path: string;
  file: File;
}

interface ChunkedUploadStartResponse {
  status: string;
  data: {
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
    path: string;
  };
  message: string;
}

interface ChunkedUploadChunkResponse {
  status: string;
  data: {
    uploadId: string;
    chunkNumber: number;
    receivedChunks: number;
    totalChunks: number;
    progress: number;
    isComplete: boolean;
  };
  message: string;
}

export const useServerUploadFileMutation = (
  serverId: string,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { addUpload, updateUpload } = useUploadProgress();

  const chunkedUpload = async (
    server: string,
    path: string,
    file: File,
    uploadId: string
  ) => {
    // Use ~50 chunks for all files
    const chunkSize = Math.ceil(file.size / 50);

    // Start chunked upload
    const startResponse = await axios.post<ChunkedUploadStartResponse>(
      `/api/chunked-upload?action=start&serverId=${encodeURIComponent(server)}`,
      { path, totalSize: file.size, chunkSize }
    );

    const {
      uploadId: sessionId,
      chunkSize: actualChunkSize,
      totalChunks,
    } = startResponse.data.data;

    // Upload chunks (0-based numbering)
    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      const start = chunkNumber * actualChunkSize;
      const end = Math.min(start + actualChunkSize, file.size);
      const chunk = file.slice(start, end);
      console.log(`Uploading chunk ${chunkNumber + 1}/${totalChunks}, size: ${chunk.size} bytes`);

      const chunkResponse = await axios.put<ChunkedUploadChunkResponse>(
        `/api/chunked-upload?serverId=${encodeURIComponent(server)}&uploadId=${sessionId}&chunkNumber=${chunkNumber}`,
        chunk,
        {
          headers: { "Content-Type": "application/octet-stream" },
        }
      );

      // Update progress based on chunk response
      const progress = chunkResponse.data.data.progress * 100;
      updateUpload(uploadId, { progress: Math.round(progress) });
    }

    // Complete upload
    const completeResponse = await axios.post(
      `/api/chunked-upload?action=complete&serverId=${encodeURIComponent(server)}&uploadId=${sessionId}`
    );

    return completeResponse.data;
  };

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
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`File upload: ${file.name}, size: ${fileSizeMB.toFixed(2)}MB`);

        // Use chunked upload for files larger than 50MB
        if (fileSizeMB > 50) {
          console.log("Using chunked upload for file:", file.name);
          const result = await chunkedUpload(server, path, file, uploadId);

          updateUpload(uploadId, {
            progress: 100,
            status: "completed",
          });

          return result;
        } else {
          console.log("Using regular upload for file:", file.name);
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
        }
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
