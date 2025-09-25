import { createServerFileRoute } from "@tanstack/react-start/server";

import atlas from "@/server/lib/atlas-api/atlas-api.client";
import { AuditService } from "@/server/lib/audit";
import { auth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

export const ServerRoute = createServerFileRoute("/api/upload").methods({
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
    const serverId = url.searchParams.get("serverId");
    const path = url.searchParams.get("path");

    if (!serverId || !path) {
      return new Response("Missing serverId or path parameters", {
        status: 400,
      });
    }

    try {
      // For now, let's keep the simple approach but optimize it
      // We'll implement proper streaming in a future iteration
      const atlasClient = atlas as any;
      const encodedPath = encodeURIComponent(path);
      const url = `${atlasClient.baseUrl || configManager.getAtlasConfig()?.atlasUrl || "http://localhost:9090"}/api/v1/servers/${serverId}/files/upload?path=${encodedPath}`;

      // Stream directly to Atlas without buffering
      const response = await fetch(url, {
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

      // Log successful upload
      await AuditService.logAction({
        action: "uploadServerFile",
        resourceType: "file",
        resourceId: `${serverId}:${path}`,
        details: { serverId, path },
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
      console.error("Upload error:", error);

      // Log failed upload
      await AuditService.logAction({
        action: "uploadServerFile",
        resourceType: "file",
        resourceId: `${serverId}:${path}`,
        details: { serverId, path },
        restorePossible: false,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Upload failed",
      });

      return new Response(
        error instanceof Error ? error.message : "Upload failed",
        { status: 500 }
      );
    }
  },
});
