import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { useUploadProgress } from "@/contexts/upload-progress-context";

interface TemplateUploadParams {
  path: string;
  file: File;
}

interface PresignedTemplateUploadResponse {
  uploadPath: string;
  token: string;
  expiresAt: string;
  method: string;
  atlasBaseUrl: string;
}

export const useTemplateUploadFileMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { addUpload, updateUpload } = useUploadProgress();

  // Get presigned URL for template upload
  const getTemplateUploadUrl = async (path: string): Promise<PresignedTemplateUploadResponse> => {
    const response = await axios.post("/api/get-template-upload-url", {
      path,
      expirationSeconds: 300, // 5 minutes
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
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
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

  return useMutation({
    mutationFn: async ({ path, file }: TemplateUploadParams) => {
      const uploadId = addUpload({
        fileName: file.name,
        filePath: path,
        serverId: "template",
        progress: 0,
        status: "uploading",
      });

      try {
        // Use presigned URL for direct upload
        const urlData = await getTemplateUploadUrl(path);
        const result = await uploadFileDirect(file, urlData.uploadPath, urlData.atlasBaseUrl, uploadId);

        updateUpload(uploadId, {
          progress: 100,
          status: "completed",
        });

        // Log successful template upload via separate audit endpoint if needed
        // The presigned upload itself should handle the audit logging in Atlas

        return result;
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