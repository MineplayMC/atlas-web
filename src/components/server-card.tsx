import React from "react";
import { Link } from "@tanstack/react-router";
import { CpuIcon, HardDriveIcon, MemoryStickIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Server } from "@/server/lib/atlas-api/atlas-api.schemas";

export const getStatus = (status: string) => {
  switch (status) {
    case "STARTING":
      return <div className="h-3 w-3 rounded-full bg-yellow-500" />;
    case "RUNNING":
      return <div className="h-3 w-3 rounded-full bg-green-500" />;
    case "STOPPING":
      return <div className="h-3 w-3 rounded-full bg-orange-500" />;
    case "STOPPED":
      return <div className="h-3 w-3 rounded-full bg-red-500" />;
    case "ERROR":
      return <div className="h-3 w-3 rounded-full bg-red-800" />;
    default:
      return <div className="h-3 w-3 rounded-full bg-gray-400" />;
  }
};

const formatBytes = (memory: number) => {
  const memoryInMB = memory / (1024 * 1024);

  if (memoryInMB < 1024) {
    return `${memoryInMB.toFixed(1)}MB`;
  } else {
    const memoryInGB = memoryInMB / 1024;
    return `${memoryInGB.toFixed(2)}GB`;
  }
};

const ServerCard = React.memo(({ server }: { server: Server }) => {
  return (
    <Link to="/servers/$serverId" params={{ serverId: server.name }}>
      <Card className="cursor-pointer overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <div className="p-6 pb-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatus(server.serverInfo?.status ?? "UNKNOWN")}
              <span className="font-medium">{server.name}</span>
            </div>
            <span className="text-muted-foreground bg-muted/50 rounded px-2 py-1 text-xs font-semibold uppercase">
              {server.group}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {server.address}:{server.port}
            </p>
          </div>
        </div>
        <div className="bg-muted/30 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <CpuIcon className="text-muted-foreground mb-1 h-4 w-4" />
              <p className="text-sm font-medium">
                {server.resourceMetrics?.cpuUsage
                  ? server.resourceMetrics.cpuUsage.toFixed(2)
                  : "0"}
                %
              </p>
            </div>
            <div className="flex flex-col items-center">
              <MemoryStickIcon className="text-muted-foreground mb-1 h-4 w-4" />
              <p className="text-sm font-medium">
                {formatBytes(server.resourceMetrics?.memoryUsed ?? 0)}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <HardDriveIcon className="text-muted-foreground mb-1 h-4 w-4" />
              <p className="text-sm font-medium">
                {formatBytes(server.resourceMetrics?.diskUsed ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
});

ServerCard.displayName = "ServerCard";

export const ServerCardSkeleton = () => {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-6 pb-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <div className="mt-1">
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="bg-muted/30 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <Skeleton className="mb-1 h-4 w-4" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex flex-col items-center">
            <Skeleton className="mb-1 h-4 w-4" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex flex-col items-center">
            <Skeleton className="mb-1 h-4 w-4" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ServerCard;
