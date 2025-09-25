import { createServerFileRoute } from "@tanstack/react-start/server";

import { auth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

export const ServerRoute = createServerFileRoute("/api/get-upload-url").methods({
  POST: async ({ request }) => {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const body = await request.json();
      const { serverId, path, expirationSeconds = 300 } = body;

      if (!serverId || !path) {
        return new Response("Missing serverId or path", { status: 400 });
      }

      const atlasBaseUrl = configManager.getAtlasConfig()?.atlasUrl;
      const atlasApiKey = configManager.getAtlasConfig()?.atlasApiKey;

      if (!atlasBaseUrl || !atlasApiKey) {
        return new Response("Atlas configuration not found", { status: 500 });
      }

      // Request presigned URL from Atlas
      const atlasResponse = await fetch(
        `${atlasBaseUrl}/api/v1/servers/${serverId}/files/upload/presign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${atlasApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path, expirationSeconds }),
        }
      );

      if (!atlasResponse.ok) {
        const errorText = await atlasResponse.text();
        throw new Error(`Atlas API Error: ${errorText || atlasResponse.statusText}`);
      }

      const atlasData = await atlasResponse.json();

      // Extract the actual data from Atlas response and add our base URL
      const responseData = {
        ...atlasData.data, // Extract data from nested structure
        atlasBaseUrl,
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get upload URL error:", error);
      return new Response(
        error instanceof Error ? error.message : "Failed to get upload URL",
        { status: 500 }
      );
    }
  },
});