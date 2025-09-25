import { createServerFileRoute } from "@tanstack/react-start/server";

import { AuditService } from "@/server/lib/audit";
import { auth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

export const ServerRoute = createServerFileRoute(
  "/api/template-upload"
).methods({
  POST: async ({ request }) => {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return new Response("Missing path parameter", { status: 400 });
    }

    try {
      // Try to get presigned URL first, fallback to direct upload
      const atlasBaseUrl = configManager.getAtlasConfig()?.atlasUrl;
      const atlasApiKey = configManager.getAtlasConfig()?.atlasApiKey;

      if (!atlasBaseUrl || !atlasApiKey) {
        return new Response("Atlas configuration not found", { status: 500 });
      }

      let atlasUrl: string;

      try {
        // Try to get presigned URL
        const presignResponse = await fetch(
          `${atlasBaseUrl}/api/v1/templates/files/upload/presign`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${atlasApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path, expirationSeconds: 300 }),
          }
        );

        if (presignResponse.ok) {
          const presignData = await presignResponse.json();
          atlasUrl = atlasBaseUrl + presignData.data.uploadPath;
          console.log("Using presigned URL:", atlasUrl);
        } else {
          throw new Error("Presigned URL failed");
        }
      } catch (presignError) {
        // Fallback to direct upload
        console.log("Presigned URL failed, using direct upload:", presignError);
        const encodedPath = encodeURIComponent(path);
        atlasUrl = `${atlasBaseUrl}/api/v1/templates/files/upload?path=${encodedPath}`;
      }

      // Stream directly to Atlas without buffering
      const response = await fetch(atlasUrl, {
        method: "POST",
        body: request.body,
        headers: {
          Authorization: `Bearer ${configManager.getAtlasConfig()?.atlasApiKey}`,
          "Content-Type": "application/octet-stream",
        },
        // @ts-ignore - duplex is needed for streaming
        duplex: "half",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Atlas API Error: ${errorText || response.statusText}`);
      }

      const result = await response.json();

      // Log successful template upload
      await AuditService.logAction({
        action: "uploadTemplateFile",
        resourceType: "file",
        resourceId: path,
        details: { path },
        restorePossible: false,
        success: true,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Template upload error:", error);

      // Log failed template upload
      await AuditService.logAction({
        action: "uploadTemplateFile",
        resourceType: "file",
        resourceId: path,
        details: { path },
        restorePossible: false,
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Template upload failed",
      });

      return new Response(
        error instanceof Error ? error.message : "Template upload failed",
        { status: 500 }
      );
    }
  },
});
