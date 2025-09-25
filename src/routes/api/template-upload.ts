import { createServerFileRoute } from "@tanstack/react-start/server";

import atlas from "@/server/lib/atlas-api/atlas-api.client";
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
      // Proxy to Atlas API template upload endpoint
      const atlasClient = atlas as any;
      const encodedPath = encodeURIComponent(path);
      const atlasUrl = `${atlasClient.baseUrl || configManager.getAtlasConfig()?.atlasUrl || "http://localhost:9090"}/api/v1/templates/files/upload?path=${encodedPath}`;

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
