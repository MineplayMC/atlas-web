import { z } from "zod";

export const SystemStatusSchema = z.object({
  status: z.string(),
  data: z.object({
    running: z.boolean(),
    debugMode: z.boolean(),
    uptime: z.number(),
  }),
  timestamp: z.number(),
});

export const ServerInfoSchema = z.object({
  status: z.string(),
  onlinePlayers: z.number().optional(),
  maxPlayers: z.number().optional(),
  onlinePlayerNames: z.array(z.string()).optional(),
});

export const ServerSchema = z.object({
  serverId: z.string(),
  name: z.string(),
  group: z.string(),
  workingDirectory: z.string(),
  address: z.string(),
  port: z.number(),
  type: z.string(),
  createdAt: z.number(),
  lastHeartbeat: z.number(),
  serviceProviderId: z.string(),
  shutdown: z.boolean(),
  manuallyScaled: z.boolean(),
  serverInfo: ServerInfoSchema.optional(),
  resourceMetrics: z
    .object({
      cpuUsage: z.number().min(0).optional(),
      memoryUsed: z.number().min(0).optional(),
      memoryTotal: z.number().min(0).optional(),
      diskUsed: z.number().min(0).optional(),
      diskTotal: z.number().min(0).optional(),
      lastUpdated: z.number().min(0).optional(),
      memoryPercentage: z.number().min(0).max(100).optional(),
      diskPercentage: z.number().min(0).max(100).optional(),
      networkReceiveBytes: z.number().min(0).optional(),
      networkSendBytes: z.number().min(0).optional(),
      networkReceiveBandwidth: z.number().min(0).optional(),
      networkSendBandwidth: z.number().min(0).optional(),
      networkTotalBandwidth: z.number().min(0).optional(),
    })
    .nullish(),
});

export const CreateServerRequestSchema = z.object({
  name: z.string(),
  type: z.string(),
  port: z.number().optional(),
  host: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export const ServerCommandSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
});

export const CommandResponseSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

export const ScalingGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  target_count: z.number(),
  current_count: z.number(),
  status: z.enum(["active", "scaling", "error"]),
  servers: z.array(z.string()),
});

export const ScalingGroupResponse = z.object({
  status: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export const ScaleRequestSchema = z.object({
  direction: z.enum(["up", "down"]),
  count: z.number().min(0),
});

export const ScalingConfigSchema = z.object({
  enabled: z.boolean(),
  min_servers: z.number().min(0),
  max_servers: z.number().min(1),
  scale_up_threshold: z.number().min(0).max(100),
  scale_down_threshold: z.number().min(0).max(100),
  cooldown_period: z.number().min(0),
});

export const SystemMetricsSchema = z.object({
  cpu_usage: z.number().min(0).max(100),
  memory_usage: z.number().min(0).max(100),
  disk_usage: z.number().min(0).max(100),
  network_rx: z.number().min(0),
  network_tx: z.number().min(0),
  active_servers: z.number().min(0),
  total_requests: z.number().min(0),
  timestamp: z.string(),
});

export const UtilizationCpuMapSchema = z.object({
  cores: z.number().min(1),
  usage: z.number().min(0),
  formatted: z.string(),
});

export const UtilizationMemoryMapSchema = z.object({
  used: z.number().min(0),
  total: z.number().min(0),
  percentage: z.number().min(0).max(100),
  usedFormatted: z.string(),
  totalFormatted: z.string(),
});

export const UtilizationDiskMapSchema = z.object({
  used: z.number().min(0),
  total: z.number().min(0),
  percentage: z.number().min(0).max(100),
  usedFormatted: z.string(),
  totalFormatted: z.string(),
});

export const UtilizationBandwidthMapSchema = z.object({
  used: z.number().min(0),
  total: z.number().min(0),
  percentage: z.number().min(0),
  receiveRate: z.number().min(0),
  sendRate: z.number().min(0),
  usedFormatted: z.string(),
  totalFormatted: z.string(),
  receiveFormatted: z.string(),
  sendFormatted: z.string(),
});

export const UtilizationMapSchema = z.object({
  cpu: UtilizationCpuMapSchema,
  memory: UtilizationMemoryMapSchema,
  disk: UtilizationDiskMapSchema,
  bandwidth: UtilizationBandwidthMapSchema,
});

export const UtilizationResponseSchema = z.object({
  status: z.string(),
  data: UtilizationMapSchema,
  timestamp: z.number(),
});

export const PlayerCountMapSchema = z.object({
  total: z.number().min(0),
  capacity: z.number().min(0),
  percentage: z.number().min(0).max(100),
  byGroup: z.record(z.string(), z.number().min(0)),
  byStatus: z.record(z.string(), z.number().min(0)),
});

export const PlayerCountResponseSchema = z.object({
  status: z.string(),
  data: PlayerCountMapSchema,
  timestamp: z.number(),
});

export const ServerCountMapSchema = z.object({
  total: z.number().min(0),
  byStatus: z.record(z.string(), z.number().min(0)),
  byGroup: z.record(z.string(), z.number().min(0)),
});

export const ServerCountResponseSchema = z.object({
  status: z.string(),
  data: ServerCountMapSchema,
  timestamp: z.number(),
});

export const ServerListFiltersSchema = z.object({
  group: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export const WebSocketMessageSchema = z.object({
  type: z.enum(["log", "status", "metrics", "error", "command_result"]),
  server_id: z.string().optional(),
  data: z.any(),
  timestamp: z.string(),
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  status: z.number(),
  timestamp: z.string(),
});

export const ServersResponseSchema = z.object({
  status: z.string(),
  data: z.array(ServerSchema),
  timestamp: z.number(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    data: z.array(dataSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    has_next: z.boolean(),
    has_prev: z.boolean(),
  });

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.string(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
    timestamp: z.number(),
  });

export const DeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
});

export const GroupScalingSchema = z.object({
  type: z.string(),
  scaleUpThreshold: z.number().min(0).max(1),
  scaleDownThreshold: z.number().min(0).max(1),
});

export const GroupSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  priority: z.number(),
  type: z.string(),
  scalerType: z.string(),
  minServers: z.number().min(0),
  maxServers: z.number().min(0),
  currentServers: z.number().min(0),
  onlineServers: z.number().min(0),
  totalPlayers: z.number().min(0),
  totalCapacity: z.number().min(0),
  templates: z.array(z.string()),
  scaling: GroupScalingSchema,
});

export const GroupsResponseSchema = z.object({
  status: z.string(),
  data: z.array(GroupSchema),
  timestamp: z.number(),
});

export const GroupResponseSchema = z.object({
  status: z.string(),
  data: GroupSchema,
  timestamp: z.number(),
});

export const ServerLogsDataSchema = z.object({
  lines: z.number(),
  serverId: z.string(),
  logs: z.array(z.string()),
});

export const ServerLogsResponseSchema = z.object({
  status: z.string(),
  data: ServerLogsDataSchema,
  message: z.string(),
  timestamp: z.number(),
});

export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export type ServerInfo = z.infer<typeof ServerInfoSchema>;
export type Server = z.infer<typeof ServerSchema>;
export type ServersResponse = z.infer<typeof ServersResponseSchema>;
export type CreateServerRequest = z.infer<typeof CreateServerRequestSchema>;
export type ServerCommand = z.infer<typeof ServerCommandSchema>;
export type CommandResponse = z.infer<typeof CommandResponseSchema>;
export type ScalingGroup = z.infer<typeof ScalingGroupSchema>;
export type ScaleRequest = z.infer<typeof ScaleRequestSchema>;
export type ScalingGroupResponse = z.infer<typeof ScalingGroupResponse>;
export type ScalingConfig = z.infer<typeof ScalingConfigSchema>;
export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;
export type UtilizationCpuMap = z.infer<typeof UtilizationCpuMapSchema>;
export type UtilizationMemoryMap = z.infer<typeof UtilizationMemoryMapSchema>;
export type UtilizationDiskMap = z.infer<typeof UtilizationDiskMapSchema>;
export type UtilizationBandwidthMap = z.infer<
  typeof UtilizationBandwidthMapSchema
>;
export type UtilizationMap = z.infer<typeof UtilizationMapSchema>;
export type UtilizationResponse = z.infer<typeof UtilizationResponseSchema>;
export type PlayerCountMap = z.infer<typeof PlayerCountMapSchema>;
export type PlayerCountResponse = z.infer<typeof PlayerCountResponseSchema>;
export type ServerCountMap = z.infer<typeof ServerCountMapSchema>;
export type ServerCountResponse = z.infer<typeof ServerCountResponseSchema>;
export type ServerListFilters = z.infer<typeof ServerListFiltersSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
};
export type ApiResponse<T> = {
  status: string;
  data?: T;
  error?: ApiError;
  timestamp: number;
};
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;
export type GroupScaling = z.infer<typeof GroupScalingSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type GroupsResponse = z.infer<typeof GroupsResponseSchema>;
export type GroupResponse = z.infer<typeof GroupResponseSchema>;
export type ServerLogsData = z.infer<typeof ServerLogsDataSchema>;
export type ServerLogsResponse = z.infer<typeof ServerLogsResponseSchema>;

export const FileItemSchema = z.object({
  name: z.string(),
  mode: z.string(),
  modeBits: z.number(),
  mimeType: z.string(),
  createdAt: z.string(),
  modifiedAt: z.string(),
  file: z.boolean(),
  symlink: z.boolean(),
  size: z.number().optional(),
});

export const FilesDataSchema = z.object({
  path: z.string(),
  files: z.array(FileItemSchema),
});

export const FilesResponseSchema = z.object({
  status: z.string(),
  data: FilesDataSchema,
  timestamp: z.number(),
});

export type FileItem = z.infer<typeof FileItemSchema>;
export type FilesData = z.infer<typeof FilesDataSchema>;
export type FilesResponse = z.infer<typeof FilesResponseSchema>;

export const FileContentsResponseSchema = z.object({
  status: z.string(),
  data: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export const FileWriteResponseSchema = z.object({
  status: z.string(),
  data: z.null(),
  message: z.string(),
  timestamp: z.number(),
});

export const FileDeleteResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export const FileRenameRequestSchema = z.object({
  oldPath: z.string(),
  newPath: z.string(),
});

export const FileRenameResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export const FileMkdirRequestSchema = z.object({
  path: z.string(),
});

export const FileMkdirResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    path: z.string(),
  }),
  message: z.string(),
  timestamp: z.number(),
});

export const FileUploadResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    path: z.string(),
    size: z.number(),
  }),
  message: z.string(),
  timestamp: z.number(),
});

export const ChunkedUploadStartRequestSchema = z.object({
  path: z.string(),
  totalSize: z.number(),
});

export const ChunkedUploadStartResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    uploadId: z.string(),
    chunkSize: z.number(),
    totalChunks: z.number(),
    path: z.string(),
  }),
  message: z.string(),
});

export const ChunkedUploadChunkResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    uploadId: z.string(),
    chunkNumber: z.number(),
    receivedChunks: z.number(),
    totalChunks: z.number(),
    progress: z.number(),
    isComplete: z.boolean(),
  }),
  message: z.string(),
});

export const ChunkedUploadCompleteResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    uploadId: z.string(),
    path: z.string(),
    size: z.number(),
    totalChunks: z.number(),
  }),
  message: z.string(),
});

export type FileContentsResponse = z.infer<typeof FileContentsResponseSchema>;
export type FileWriteResponse = z.infer<typeof FileWriteResponseSchema>;
export type FileDeleteResponse = z.infer<typeof FileDeleteResponseSchema>;
export type FileRenameRequest = z.infer<typeof FileRenameRequestSchema>;
export type FileRenameResponse = z.infer<typeof FileRenameResponseSchema>;
export type FileMkdirRequest = z.infer<typeof FileMkdirRequestSchema>;
export type FileMkdirResponse = z.infer<typeof FileMkdirResponseSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type ChunkedUploadStartRequest = z.infer<typeof ChunkedUploadStartRequestSchema>;
export type ChunkedUploadStartResponse = z.infer<typeof ChunkedUploadStartResponseSchema>;
export type ChunkedUploadChunkResponse = z.infer<typeof ChunkedUploadChunkResponseSchema>;
export type ChunkedUploadCompleteResponse = z.infer<typeof ChunkedUploadCompleteResponseSchema>;

export const ActivityTypeSchema = z.enum([
  "ATLAS_LIFECYCLE",
  "SCALING_OPERATION", 
  "SERVER_RESTART",
  "PLAYER_SURGE",
  "BACKUP_OPERATION",
  "PLAYER_DROP",
  "CAPACITY_REACHED"
]);

export const ActivitySchema = z.object({
  id: z.string(),
  serverId: z.string().nullable(),
  serverName: z.string().nullable(),
  groupName: z.string().nullable(),
  activityType: ActivityTypeSchema,
  timestamp: z.string(),
  triggeredBy: z.string(),
  description: z.string(),
  metadata: z.any().nullable(),
});

export const ActivityFiltersSchema = z.object({
  limit: z.number().min(1).max(200).optional(),
  offset: z.number().min(0).optional(),
});

export const ActivitiesResponseSchema = z.object({
  status: z.string(),
  data: z.array(ActivitySchema),
  timestamp: z.number(),
});

export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityFilters = z.infer<typeof ActivityFiltersSchema>;
export type ActivitiesResponse = z.infer<typeof ActivitiesResponseSchema>;

// Zip/Unzip Schemas
export const ZipFilesRequestSchema = z.object({
  sources: z.array(z.string()).min(1, "At least one source path is required"),
  zipPath: z.string().min(1, "Zip path is required"),
  workingPath: z.string().optional()
});

export const ZipFilesResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    zipPath: z.string(),
    sources: z.array(z.string())
  }),
  message: z.string(),
  timestamp: z.number()
});

export const UnzipFileRequestSchema = z.object({
  zipPath: z.string().min(1, "Zip path is required"),
  destination: z.string().min(1, "Destination path is required"),
  workingPath: z.string().optional()
});

export const UnzipFileResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    zipPath: z.string(),
    destination: z.string()
  }),
  message: z.string(),
  timestamp: z.number()
});

export const ErrorResponseSchema = z.object({
  status: z.literal("error"),
  message: z.string(),
  timestamp: z.number()
});

export type ZipFilesRequest = z.infer<typeof ZipFilesRequestSchema>;
export type ZipFilesResponse = z.infer<typeof ZipFilesResponseSchema>;
export type UnzipFileRequest = z.infer<typeof UnzipFileRequestSchema>;
export type UnzipFileResponse = z.infer<typeof UnzipFileResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
