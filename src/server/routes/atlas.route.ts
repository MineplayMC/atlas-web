import { ORPCError, os } from "@orpc/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import atlas from "@/server/lib/atlas-api/atlas-api.client";
import {
  UnzipFileRequestSchema,
  ZipFilesRequestSchema,
} from "@/server/lib/atlas-api/atlas-api.schemas";
import { AuditService } from "@/server/lib/audit";
import { auth } from "@/server/lib/auth";
import configManager from "@/server/lib/config-manager";

const serverListInputSchema = z.object({
  group: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

const serverList = os
  .input(serverListInputSchema)
  .handler(async ({ input }) => {
    const request = getWebRequest();

    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const servers = await atlas.getServers(input);
    return servers.data;
  });

const getServer = os
  .input(z.object({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const server = await atlas.getServer(input.server);
    return server.data;
  });

const getServerLogs = os
  .input(z.object({ server: z.string(), lines: z.number().optional() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const logs = await atlas.getServerLogs(input.server, input.lines);
    return logs.data;
  });

const groupList = os.handler(async () => {
  const request = getWebRequest();

  const session = await auth.api.getSession({
    headers: request?.headers ?? new Headers(),
  });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }

  const groups = await atlas.getGroups();
  return groups.data;
});

const getGroup = os
  .input(z.object({ group: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const group = await atlas.getGroup(input.group);
    return group.data;
  });

const scale = os
  .input(z.object({ group: z.string(), direction: z.enum(["up", "down"]) }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const group = await atlas.scaleGroup(input.group, {
        count: 1,
        direction: input.direction,
      });

      await AuditService.logAction({
        action: "scale",
        resourceType: "group",
        resourceId: input.group,
        details: input,
        restorePossible: false,
        success: true,
      });

      return group.data;
    } catch (error) {
      await AuditService.logAction({
        action: "scale",
        resourceType: "group",
        resourceId: input.group,
        details: input,
        restorePossible: false,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const serverCount = os.handler(async () => {
  const request = getWebRequest();

  const session = await auth.api.getSession({
    headers: request?.headers ?? new Headers(),
  });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }

  const servers = await atlas.getServerCount();
  return servers.data;
});

const playerCount = os.handler(async () => {
  const request = getWebRequest();

  const session = await auth.api.getSession({
    headers: request?.headers ?? new Headers(),
  });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }

  const players = await atlas.getPlayerCount();
  return players.data;
});

const utilization = os.handler(async () => {
  const request = getWebRequest();

  const session = await auth.api.getSession({
    headers: request?.headers ?? new Headers(),
  });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }

  const utilization = await atlas.getUtilization();
  return utilization.data;
});

const startServer = os
  .input(z.object({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const result = await atlas.startServer(input.server);

      await AuditService.logAction({
        action: "startServer",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        success: true,
      });

      return result.data;
    } catch (error) {
      await AuditService.logAction({
        action: "startServer",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const stopServer = os
  .input(z.object({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const result = await atlas.stopServer(input.server);

      await AuditService.logAction({
        action: "stopServer",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        success: true,
      });

      return result.data;
    } catch (error) {
      await AuditService.logAction({
        action: "stopServer",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const restartServer = os
  .input(z.object({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const result = await atlas.restartServer(input.server);

      await AuditService.logAction({
        action: "restartServer",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        success: true,
      });

      return result.data;
    } catch (error) {
      await AuditService.logAction({
        action: "restartServer",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const getServerFiles = os
  .input(z.object({ server: z.string(), path: z.string().optional() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const files = await atlas.getServerFiles(input.server, input.path);
    return files.data;
  });

const getServerFileContents = os
  .input(z.object({ server: z.string(), file: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const fileContents = await atlas.getServerFileContents(
        input.server,
        input.file
      );

      await AuditService.logAction({
        action: "getServerFileContents",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        restorePossible: false,
        success: true,
      });

      return fileContents;
    } catch (error) {
      await AuditService.logAction({
        action: "getServerFileContents",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        restorePossible: false,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const writeServerFileContents = os
  .input(
    z.object({ server: z.string(), file: z.string(), content: z.string() })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const backupData = await AuditService.captureFileBackup(
      "writeServerFileContents",
      input.server,
      input.file
    );

    try {
      const result = await atlas.writeServerFileContents(
        input.server,
        input.file,
        input.content
      );

      await AuditService.logAction({
        action: "writeServerFileContents",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        backupData,
        success: true,
      });

      return result;
    } catch (error) {
      await AuditService.logAction({
        action: "writeServerFileContents",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        backupData,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const deleteServerFile = os
  .input(z.object({ server: z.string(), file: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const backupData = await AuditService.captureFileBackup(
      "deleteServerFile",
      input.server,
      input.file
    );

    try {
      const result = await atlas.deleteServerFile(input.server, input.file);

      await AuditService.logAction({
        action: "deleteServerFile",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        backupData,
        success: true,
      });

      return result;
    } catch (error) {
      await AuditService.logAction({
        action: "deleteServerFile",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        backupData,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const renameServerFile = os
  .input(
    z.object({ server: z.string(), oldPath: z.string(), newPath: z.string() })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const result = await atlas.renameServerFile(input.server, {
        oldPath: input.oldPath,
        newPath: input.newPath,
      });

      await AuditService.logAction({
        action: "renameServerFile",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        backupData: { originalPath: input.oldPath },
        success: true,
      });

      return result;
    } catch (error) {
      await AuditService.logAction({
        action: "renameServerFile",
        resourceType: "server",
        resourceId: input.server,
        details: input,
        backupData: { originalPath: input.oldPath },
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const moveServerFile = os
  .input(
    z.object({ server: z.string(), file: z.string(), newPath: z.string() })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.renameServerFile(input.server, {
      oldPath: input.file,
      newPath: input.newPath,
    });

    return result;
  });

const downloadServerFile = os
  .input(z.object({ server: z.string(), file: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.downloadServerFile(input.server, input.file);
    return result;
  });

const createServerFolder = os
  .input(z.object({ server: z.string(), path: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.createServerFolder(input.server, input.path);
    return result;
  });

const uploadServerFile = os
  .input(
    z.object({ server: z.string(), path: z.string(), file: z.instanceof(File) })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.uploadServerFile(
      input.server,
      input.path,
      input.file
    );
    return result;
  });

const executeServerCommand = os
  .input(z.object({ server: z.string(), command: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.executeServerCommand(input.server, {
      command: input.command,
    });
    return result.data;
  });

const getWebSocketToken = os
  .input(z.object({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    // Generate WebSocket token via Atlas API
    const tokenResponse = await atlas.generateWebSocketToken(input.server);

    if (!tokenResponse.data) {
      throw new ORPCError("INTERNAL_ERROR", {
        message: "Failed to generate WebSocket token",
      });
    }

    return {
      token: tokenResponse.data.token,
      expiresAt: tokenResponse.data.expiresAt,
      wsUrl: `${configManager.getAtlasConfig()?.baseUrl!.replace(/^http/, "ws")}/api/v1/servers/${input.server}/ws`,
    };
  });

const activityFiltersInputSchema = z.object({
  limit: z.number().min(1).max(200).optional(),
  offset: z.number().min(0).optional(),
});

const getRecentActivities = os
  .input(activityFiltersInputSchema)
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const activities = await atlas.getRecentActivities(input);
    return activities;
  });

const getServerActivities = os
  .input(activityFiltersInputSchema.extend({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const { server, ...filters } = input;
    const activities = await atlas.getServerActivities(server, filters);
    return activities;
  });

const getGroupActivities = os
  .input(activityFiltersInputSchema.extend({ group: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const { group, ...filters } = input;
    const activities = await atlas.getGroupActivities(group, filters);
    return activities;
  });

const zipServerFiles = os
  .input(ZipFilesRequestSchema.extend({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const { server, ...zipData } = input;
    const result = await atlas.zipServerFiles(server, zipData);
    return result;
  });

const unzipServerFile = os
  .input(UnzipFileRequestSchema.extend({ server: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const { server, ...unzipData } = input;
    const result = await atlas.unzipServerFile(server, unzipData);
    return result;
  });

// Template File Management
const getTemplateFiles = os
  .input(z.object({ path: z.string().optional() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const files = await atlas.getTemplateFiles(input.path);
    return files.data;
  });

const getTemplateFileContents = os
  .input(z.object({ file: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const fileContents = await atlas.getTemplateFileContents(input.file);

      await AuditService.logAction({
        action: "getTemplateFileContents",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        restorePossible: false,
        success: true,
      });

      return fileContents;
    } catch (error) {
      await AuditService.logAction({
        action: "getTemplateFileContents",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        restorePossible: false,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const writeTemplateFileContents = os
  .input(z.object({ file: z.string(), content: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const backupData = await AuditService.captureTemplateFileBackup(
      "writeTemplateFileContents",
      input.file
    );

    try {
      const result = await atlas.writeTemplateFileContents(
        input.file,
        input.content
      );

      await AuditService.logAction({
        action: "writeTemplateFileContents",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        backupData,
        success: true,
      });

      return result;
    } catch (error) {
      await AuditService.logAction({
        action: "writeTemplateFileContents",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        backupData,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const deleteTemplateFile = os
  .input(z.object({ file: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const backupData = await AuditService.captureTemplateFileBackup(
      "deleteTemplateFile",
      input.file
    );

    try {
      const result = await atlas.deleteTemplateFile(input.file);

      await AuditService.logAction({
        action: "deleteTemplateFile",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        backupData,
        success: true,
      });

      return result;
    } catch (error) {
      await AuditService.logAction({
        action: "deleteTemplateFile",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        backupData,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const renameTemplateFile = os
  .input(z.object({ oldPath: z.string(), newPath: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const result = await atlas.renameTemplateFile(input);

      await AuditService.logAction({
        action: "renameTemplateFile",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        backupData: { originalPath: input.oldPath },
        success: true,
      });

      return result;
    } catch (error) {
      await AuditService.logAction({
        action: "renameTemplateFile",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        backupData: { originalPath: input.oldPath },
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const createTemplateFolder = os
  .input(z.object({ path: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    try {
      const result = await atlas.createTemplateFolder(input.path);

      await AuditService.logAction({
        action: "createTemplateFolder",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        success: true,
      });

      return result;
    } catch (error) {
      await AuditService.logAction({
        action: "createTemplateFolder",
        resourceType: "template",
        resourceId: "templates",
        details: input,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const downloadTemplateFile = os
  .input(z.object({ file: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.downloadTemplateFile(input.file);
    return result;
  });

const zipTemplateFiles = os
  .input(ZipFilesRequestSchema)
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.zipTemplateFiles(input);
    return result;
  });

const unzipTemplateFile = os
  .input(UnzipFileRequestSchema)
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await atlas.unzipTemplateFile(input);
    return result;
  });

// Audit and Restore Endpoints
const getAuditHistory = os
  .input(
    z.object({
      resourceType: z.enum(["server", "group", "template", "file"]),
      resourceId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, input.resourceType),
          eq(auditLogs.resourceId, input.resourceId)
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(input.limit)
      .offset(input.offset);

    return {
      logs: logs.map((log) => ({
        ...log,
        details: JSON.parse(log.details),
        backupData: log.backupData ? JSON.parse(log.backupData) : null,
      })),
      total: logs.length,
    };
  });

const getRestorableActions = os
  .input(
    z.object({
      resourceType: z.enum(["server", "group", "template", "file"]),
      resourceId: z.string(),
      limit: z.number().min(1).max(50).default(20),
    })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, input.resourceType),
          eq(auditLogs.resourceId, input.resourceId),
          eq(auditLogs.restorePossible, true),
          eq(auditLogs.success, true)
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(input.limit);

    return logs.map((log) => ({
      ...log,
      details: JSON.parse(log.details),
      backupData: log.backupData ? JSON.parse(log.backupData) : null,
    }));
  });

const restoreAction = os
  .input(z.object({ auditLogId: z.string() }))
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const result = await AuditService.restoreAction(input.auditLogId);

    if (!result.success) {
      throw new ORPCError("BAD_REQUEST", { message: result.message });
    }

    return result;
  });

const getServerAuditHistory = os
  .input(
    z.object({
      serverId: z.string().optional(),
      serverName: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
      actionType: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    // Build where conditions based on input
    const whereConditions: any[] = [];

    if (input.serverId && input.serverName) {
      // Both ID and name provided - search for either
      whereConditions.push(
        or(
          eq(auditLogs.resourceId, input.serverId),
          eq(auditLogs.resourceId, input.serverName)
        )
      );
    } else if (input.serverId) {
      whereConditions.push(eq(auditLogs.resourceId, input.serverId));
    } else if (input.serverName) {
      whereConditions.push(eq(auditLogs.resourceId, input.serverName));
    }

    // Add resource type filter (only server actions)
    whereConditions.push(eq(auditLogs.resourceType, "server"));

    // Add search filter if provided
    if (input.search) {
      whereConditions.push(
        or(
          like(auditLogs.action, `%${input.search}%`),
          like(auditLogs.details, `%${input.search}%`)
        )
      );
    }

    // Add action type filter if provided
    if (input.actionType) {
      whereConditions.push(like(auditLogs.action, `%${input.actionType}%`));
    }

    const [logs, totalResult] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          details: auditLogs.details,
          backupData: auditLogs.backupData,
          restorePossible: auditLogs.restorePossible,
          restoredAt: auditLogs.restoredAt,
          restoredBy: auditLogs.restoredBy,
          timestamp: auditLogs.timestamp,
          success: auditLogs.success,
          errorMessage: auditLogs.errorMessage,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit)
        .offset(input.offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(and(...whereConditions)),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        details: JSON.parse(log.details),
        backupData: log.backupData ? JSON.parse(log.backupData) : null,
      })),
      total: totalResult[0]?.count ?? 0,
    };
  });

const getGroupAuditHistory = os
  .input(
    z.object({
      groupId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
      actionType: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const whereConditions: any[] = [
      eq(auditLogs.resourceType, "group"),
      eq(auditLogs.resourceId, input.groupId),
    ];

    if (input.search) {
      whereConditions.push(
        or(
          like(auditLogs.action, `%${input.search}%`),
          like(auditLogs.details, `%${input.search}%`)
        )
      );
    }

    if (input.actionType) {
      whereConditions.push(like(auditLogs.action, `%${input.actionType}%`));
    }

    const [logs, totalResult] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          details: auditLogs.details,
          backupData: auditLogs.backupData,
          restorePossible: auditLogs.restorePossible,
          restoredAt: auditLogs.restoredAt,
          restoredBy: auditLogs.restoredBy,
          timestamp: auditLogs.timestamp,
          success: auditLogs.success,
          errorMessage: auditLogs.errorMessage,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit)
        .offset(input.offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(and(...whereConditions)),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        details: JSON.parse(log.details),
        backupData: log.backupData ? JSON.parse(log.backupData) : null,
      })),
      total: totalResult[0]?.count ?? 0,
    };
  });

const getAllAuditLogs = os
  .input(
    z.object({
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
      resourceType: z.enum(["server", "group", "template", "file"]).optional(),
      search: z.string().optional(),
      actionType: z.enum(["create", "read", "update", "delete"]).optional(),
    })
  )
  .handler(async ({ input }) => {
    const request = getWebRequest();
    const session = await auth.api.getSession({
      headers: request?.headers ?? new Headers(),
    });

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    // Build query conditions
    const whereConditions: any[] = [];

    if (input.resourceType) {
      whereConditions.push(eq(auditLogs.resourceType, input.resourceType));
    }

    if (input.search) {
      // Search in action, resourceId, and details
      whereConditions.push(
        or(
          like(auditLogs.action, `%${input.search}%`),
          like(auditLogs.resourceId, `%${input.search}%`),
          like(auditLogs.details, `%${input.search}%`)
        )
      );
    }

    if (input.actionType) {
      // Map action types to specific actions
      const actionPatterns: Record<string, string[]> = {
        create: ["create%", "upload%", "start%"],
        read: ["get%", "read%"],
        update: ["write%", "rename%", "move%", "restart%", "scale%"],
        delete: ["delete%", "stop%"],
      };

      const patterns = actionPatterns[input.actionType] || [];
      if (patterns.length > 0) {
        whereConditions.push(
          or(...patterns.map((pattern) => like(auditLogs.action, pattern)))
        );
      }
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;

    // Get logs with user information
    const logs = await db
      .select({
        // Audit log fields
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        backupData: auditLogs.backupData,
        restorePossible: auditLogs.restorePossible,
        restoredAt: auditLogs.restoredAt,
        restoredBy: auditLogs.restoredBy,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        timestamp: auditLogs.timestamp,
        success: auditLogs.success,
        errorMessage: auditLogs.errorMessage,
        // User fields
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(input.limit)
      .offset(input.offset);

    return {
      logs: logs.map((log) => ({
        ...log,
        details: JSON.parse(log.details),
        backupData: log.backupData ? JSON.parse(log.backupData) : null,
      })),
      total,
      page: Math.floor(input.offset / input.limit) + 1,
      totalPages: Math.ceil(total / input.limit),
    };
  });

export default {
  serverList,
  getServer,
  groupList,
  getGroup,
  serverCount,
  playerCount,
  utilization,
  getServerLogs,
  scale,
  startServer,
  stopServer,
  restartServer,
  getServerFiles,
  getServerFileContents,
  writeServerFileContents,
  deleteServerFile,
  renameServerFile,
  moveServerFile,
  downloadServerFile,
  createServerFolder,
  uploadServerFile,
  zipServerFiles,
  unzipServerFile,
  executeServerCommand,
  getWebSocketToken,
  getRecentActivities,
  getServerActivities,
  getGroupActivities,
  // Template File Management
  getTemplateFiles,
  getTemplateFileContents,
  writeTemplateFileContents,
  deleteTemplateFile,
  renameTemplateFile,
  createTemplateFolder,
  downloadTemplateFile,
  zipTemplateFiles,
  unzipTemplateFile,
  // Audit and Restore
  getAuditHistory,
  getRestorableActions,
  restoreAction,
  getServerAuditHistory,
  getGroupAuditHistory,
  getAllAuditLogs,
};
