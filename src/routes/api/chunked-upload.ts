import { createServerFileRoute } from "@tanstack/react-start/server";

import { auth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

export const ServerRoute = createServerFileRoute("/api/chunked-upload").methods(
  {
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
      const action = url.searchParams.get("action");
      const serverId = url.searchParams.get("serverId");

      if (!serverId || !action) {
        return new Response("Missing serverId or action parameters", {
          status: 400,
        });
      }

      const atlasBaseUrl =
        configManager.getAtlasConfig()?.atlasUrl || "http://localhost:9090";

      try {
        if (action === "start") {
          // Proxy start chunked upload to Atlas
          const body = await request.json();
          const atlasUrl = `${atlasBaseUrl}/api/v1/servers/${serverId}/files/upload/start`;

          const response = await fetch(atlasUrl, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
              Authorization: `Bearer ${configManager.getAtlasConfig()?.atlasApiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Atlas API Error: ${errorText || response.statusText}`
            );
          }

          const result = await response.json();

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } else if (action === "complete") {
          // Proxy complete chunked upload to Atlas
          const uploadId = url.searchParams.get("uploadId");

          if (!uploadId) {
            return new Response("Missing uploadId", { status: 400 });
          }

          const atlasUrl = `${atlasBaseUrl}/api/v1/servers/${serverId}/files/upload/${uploadId}/complete`;

          const response = await fetch(atlasUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${configManager.getAtlasConfig()?.atlasApiKey}`,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Atlas API Error: ${errorText || response.statusText}`
            );
          }

          const result = await response.json();

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } else {
          return new Response("Invalid action", { status: 400 });
        }
      } catch (error) {
        console.error("Chunked upload error:", error);
        return new Response(
          error instanceof Error ? error.message : "Chunked upload failed",
          { status: 500 }
        );
      }
    },

    PUT: async ({ request }) => {
      // Proxy chunk upload to Atlas
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }

      const url = new URL(request.url);
      const serverId = url.searchParams.get("serverId");
      const uploadId = url.searchParams.get("uploadId");
      const chunkNumber = url.searchParams.get("chunkNumber");

      if (!serverId || !uploadId || !chunkNumber) {
        return new Response("Missing required parameters", { status: 400 });
      }

      try {
        const atlasBaseUrl =
          configManager.getAtlasConfig()?.atlasUrl || "http://localhost:9090";
        const atlasUrl = `${atlasBaseUrl}/api/v1/servers/${serverId}/files/upload/${uploadId}/chunk/${chunkNumber}`;

        const response = await fetch(atlasUrl, {
          method: "PUT",
          body: request.body,
          headers: {
            Authorization: `Bearer ${configManager.getAtlasConfig()?.atlasApiKey}`,
          },
          // @ts-ignore - duplex is needed for streaming
          duplex: "half",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Atlas API Error: ${errorText || response.statusText}`
          );
        }

        const result = await response.json();

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Chunk upload error:", error);
        return new Response(
          error instanceof Error ? error.message : "Chunk upload failed",
          { status: 500 }
        );
      }
    },
  }
);
