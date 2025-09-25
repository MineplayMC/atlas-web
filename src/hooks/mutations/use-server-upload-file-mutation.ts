import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { useUploadProgress } from "@/contexts/upload-progress-context";

interface UploadParams {
  server: string;
  path: string;
  file: File;
}

interface PresignedUploadResponse {
  uploadPath: string;
  token: string;
  expiresAt: string;
  method: string;
  atlasBaseUrl: string;
}

interface PresignedChunkedUploadResponse {
  uploadId: string;
  chunkPathTemplate: string;
  completePath: string;
  token: string;
  chunkSize: number;
  totalChunks: number;
  expiresAt: string;
  atlasBaseUrl: string;
}

export const useServerUploadFileMutation = (
  serverId: string,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { addUpload, updateUpload } = useUploadProgress();

  // Get presigned URL for simple upload
  const getSimpleUploadUrl = async (serverId: string, path: string): Promise<PresignedUploadResponse> => {
    const response = await axios.post("/api/get-upload-url", {
      serverId,
      path,
      expirationSeconds: 300, // 5 minutes
    });
    return response.data;
  };

  // Get presigned URL for chunked upload
  const getChunkedUploadUrl = async (
    serverId: string,
    path: string,
    totalSize: number
  ): Promise<PresignedChunkedUploadResponse> => {
    const response = await axios.post("/api/get-chunked-upload-url", {
      serverId,
      path,
      totalSize,
      chunkSize: 1048576, // 1MB chunks
      expirationSeconds: 1800, // 30 minutes
    });
    return response.data;
  };

  // Complete chunked upload
  const completeChunkedUpload = async (serverId: string, uploadId: string, path: string) => {
    const response = await axios.post("/api/complete-upload", {
      serverId,
      uploadId,
      path,
    });
    return response.data;
  };

  // Upload file directly to Atlas using presigned URL
  const uploadFileDirect = async (
    file: File,
    uploadPath: string,
    atlasBaseUrl: string,
    uploadId: string
  ) => {

    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          updateUpload(uploadId, { progress: Math.round(progress) });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            resolve({ success: true });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));

      xhr.open("POST", atlasBaseUrl + uploadPath);
      xhr.timeout = 10 * 60 * 1000; // 10 minutes

      // CRITICAL: Override browser's automatic Content-Type for presigned uploads
      xhr.setRequestHeader("Content-Type", "");

      xhr.send(file);
    });
  };

  // Upload file in chunks directly to Atlas
  const uploadFileChunked = async (
    file: File,
    chunkData: PresignedChunkedUploadResponse,
    uploadId: string
  ) => {
    const { chunkPathTemplate, chunkSize, totalChunks, atlasBaseUrl } = chunkData;

    // Upload chunks (0-based indexing as per docs)
    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      const start = chunkNumber * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const chunkPath = chunkPathTemplate.replace("{chunkNumber}", chunkNumber.toString());

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const progress = ((chunkNumber + 1) / totalChunks) * 100;
            updateUpload(uploadId, { progress: Math.round(progress) });
            resolve();
          } else {
            reject(new Error(`Chunk ${chunkNumber} upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error(`Chunk ${chunkNumber} upload failed`));
        xhr.ontimeout = () => reject(new Error(`Chunk ${chunkNumber} upload timeout`));

        xhr.open("PUT", atlasBaseUrl + chunkPath);
        xhr.timeout = 60000; // 1 minute per chunk

        // CRITICAL: Override browser's automatic Content-Type for presigned uploads
        xhr.setRequestHeader("Content-Type", "");

        xhr.send(chunk);
      });
    }

    // Complete the upload
    return completeChunkedUpload(serverId, chunkData.uploadId, ""); // path will be in audit log
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
        console.log(`Uploading ${file.name} (${fileSizeMB.toFixed(2)}MB) using presigned URLs`);

        if (fileSizeMB > 10) {
          // Use chunked upload for files > 10MB
          console.log("Using chunked presigned upload");
          const chunkData = await getChunkedUploadUrl(server, path, file.size);
          const result = await uploadFileChunked(file, chunkData, uploadId);

          updateUpload(uploadId, {
            progress: 100,
            status: "completed",
          });

          return result;
        } else {
          // Use simple upload for smaller files
          console.log("Using simple presigned upload");
          const urlData = await getSimpleUploadUrl(server, path);
          const result = await uploadFileDirect(file, urlData.uploadPath, urlData.atlasBaseUrl, uploadId);

          updateUpload(uploadId, {
            progress: 100,
            status: "completed",
          });

          return result;
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
