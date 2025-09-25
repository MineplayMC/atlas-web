import { createServerFileRoute } from "@tanstack/react-start/server";

import { AuditService } from "@/server/lib/audit";
import { auth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

export const ServerRoute = createServerFileRoute("/api/complete-upload").methods({
  POST: async ({ request }) => {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
      const { serverId, uploadId, path } = body;

      if (!serverId || !uploadId) {
        return new Response("Missing serverId or uploadId", { status: 400 });
      }

      const atlasBaseUrl = configManager.getAtlasConfig()?.atlasUrl;
      const atlasApiKey = configManager.getAtlasConfig()?.atlasApiKey;

      if (!atlasBaseUrl || !atlasApiKey) {
        return new Response("Atlas configuration not found", { status: 500 });
      }

      // Complete chunked upload (this endpoint doesn't support presigned URLs yet)
      const atlasResponse = await fetch(
        `${atlasBaseUrl}/api/v1/servers/${serverId}/files/upload/${uploadId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${atlasApiKey}`,
          },
        }
      );

      if (!atlasResponse.ok) {
        const errorText = await atlasResponse.text();
        throw new Error(`Atlas API Error: ${errorText || atlasResponse.statusText}`);
      }

      const data = await atlasResponse.json();

      // Log successful upload
      if (path) {
        await AuditService.logAction({
          action: "uploadServerFile",
          resourceType: "file",
          resourceId: `${serverId}:${path}`,
          details: { serverId, path, uploadId },
          restorePossible: false,
          success: true,
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Complete upload error:", error);

      // Log failed upload
      if (body?.path && body?.serverId) {
        await AuditService.logAction({
          action: "uploadServerFile",
          resourceType: "file",
          resourceId: `${body.serverId}:${body.path}`,
          details: { serverId: body.serverId, path: body.path, uploadId: body.uploadId },
          restorePossible: false,
          success: false,
          errorMessage: error instanceof Error ? error.message : "Upload completion failed",
        });
      }

      return new Response(
        error instanceof Error ? error.message : "Failed to complete upload",
        { status: 500 }
      );
    }
  },
});