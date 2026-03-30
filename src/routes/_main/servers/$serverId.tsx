import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createFileRoute,
} from "@tanstack/react-router";
import {
  CircleStopIcon,
  FolderIcon,
  PlayCircleIcon,
  RefreshCcwIcon,
  TerminalIcon,
  UsersIcon,
  History,
} from "lucide-react";

import ConnectionWarning from "@/components/connection-warning";
import { getStatus } from "@/components/server-card";
import { Button } from "@/components/ui/button";
import {
  WebSocketProvider,
  useWebSocketContext,
} from "@/contexts/websocket-context";
import { useRestartServerMutation } from "@/hooks/mutations/use-restart-server-migration";
import { useStartServerMutation } from "@/hooks/mutations/use-start-server-migration";
import { useStopServerMutation } from "@/hooks/mutations/use-stop-server-migration";
import { orpc } from "@/lib/orpc";
import { seo } from "@/utils/seo";

const links = [
  {
    label: "Console",
    icon: TerminalIcon,
    to: "/servers/$serverId",
  },
  {
    label: "Files",
    icon: FolderIcon,
    to: "/servers/$serverId/files/",
  },
  {
    label: "Players",
    icon: UsersIcon,
    to: "/servers/$serverId/players",
  },
  {
    label: "Activity",
    icon: History,
    to: "/servers/$serverId/activity",
  },
];

const ServerContent = () => {
  const { serverId } = Route.useParams();
  const [realtimeServerInfo, setRealtimeServerInfo] = useState<any>(null);
  const { subscribe, connectionFailed, resetAndConnect } = useWebSocketContext();

  const { data: server } = useQuery({
    ...orpc.atlas.getServer.queryOptions({
      input: { server: serverId },
    }),
    retry: false,
    refetchInterval: (query) => (!query.state.data ? 5000 : false),
  });

  const startServerMutation = useStartServerMutation(serverId);
  const stopServerMutation = useStopServerMutation(serverId);
  const restartServerMutation = useRestartServerMutation(serverId);

  // When server becomes available after being absent, reset and reconnect WebSocket
  const prevServerRef = useRef<typeof server | null>(null);
  useEffect(() => {
    if (prevServerRef.current == null && server != null && connectionFailed) {
      resetAndConnect();
    }
    prevServerRef.current = server;
  }, [server, connectionFailed, resetAndConnect]);

  // Subscribe to WebSocket messages (ignore log messages - handled by console)
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "status-update") {
        setRealtimeServerInfo((_prev: any) => {
          // Prevent accumulation by only keeping essential data
          return {
            status: message.data.status,
            serverId: message.data.serverId,
            timestamp: Date.now(), // Add timestamp to track freshness
          };
        });
      } else if (message.type === "server-info") {
        // Limit the data stored to prevent memory accumulation
        const { status, serverId, onlinePlayers, maxPlayers } = message.data;
        setRealtimeServerInfo({
          status,
          serverId,
          onlinePlayers,
          maxPlayers,
          timestamp: Date.now(),
          // Only store essential server info, discard potentially large data
        });
      }
      // Ignore log messages - they're handled by the console component
    });

    return unsubscribe;
  }, [subscribe]);

  const currentStatus =
    realtimeServerInfo?.status ?? server?.serverInfo?.status ?? "UNKNOWN";
  const isStopped = currentStatus === "STOPPED";

  const displayName = server?.name ?? serverId;
  const displayAddress = server ? `${server.address}:${server.port}` : "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center md:gap-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              {getStatus(currentStatus)}
              <h1 className="text-2xl font-bold">{displayName}</h1>
            </div>
            <p className="text-muted-foreground text-sm">{displayAddress}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={!isStopped || !server || startServerMutation.isPending}
            onClick={() => startServerMutation.mutate({ server: serverId })}
            className="h-[38px] w-[64px] rounded-md border border-green-500 bg-green-600 text-white hover:!bg-green-700 disabled:opacity-50"
          >
            <PlayCircleIcon size={20} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-[38px] w-[64px] rounded-md border border-neutral-500 bg-neutral-700 text-white hover:!bg-neutral-600 disabled:opacity-50"
            onClick={() => restartServerMutation.mutate({ server: serverId })}
            disabled={isStopped || !server || restartServerMutation.isPending}
          >
            <RefreshCcwIcon size={20} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isStopped || !server || stopServerMutation.isPending}
            onClick={() => stopServerMutation.mutate({ server: serverId })}
            className="h-[38px] w-[64px] rounded-md border border-red-600 bg-red-800 text-white hover:!bg-red-900 disabled:opacity-50"
          >
            <CircleStopIcon size={20} />
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {links.map((link, index) => (
          <Link
            key={link.label}
            to={link.to}
            params={{ serverId }}
            className="text-muted-foreground hover:text-foreground hover:border-muted-foreground border-b-2 border-transparent px-4 py-2 text-sm font-medium"
            activeOptions={{ exact: index === 0 }}
            activeProps={{
              className:
                "!border-primary !text-primary !border-b-2 !px-4 !py-2 !text-sm !font-medium",
            }}
          >
            <div className="flex items-center gap-2">
              <link.icon className="h-4 w-4" />
              {link.label}
            </div>
          </Link>
        ))}
      </div>

      <Outlet />
      <ConnectionWarning serverStatus={currentStatus} />
    </div>
  );
};

const RouteComponent = () => {
  const { serverId } = Route.useParams();
  return (
    <WebSocketProvider serverId={serverId}>
      <ServerContent />
    </WebSocketProvider>
  );
};

export const Route = createFileRoute("/_main/servers/$serverId")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        orpc.atlas.getServer.queryOptions({
          input: { server: params.serverId },
        })
      );
    } catch {
      return null;
    }
  },
  head: async ({ loaderData }) => {
    return {
      meta: [
        ...seo({
          title: `${loaderData?.name ?? "Server not found"} | Atlas`,
        }),
      ],
    };
  },

  component: RouteComponent,
});
