import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, Search } from "lucide-react";

import { TerminalLine } from "@/components/server/terminal-line";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebSocketContext } from "@/contexts/websocket-context";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { parseLogs } from "@/lib/console-utils";
import { orpc } from "@/lib/orpc";
import { Server } from "@/server/lib/atlas-api/atlas-api.schemas";
import { LogLine } from "@/types/console";

const ServerConsole = ({ server }: { server: Server }) => {
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [history, setHistory] = usePersistedState<string[]>(
    `${server.name}:command_history`,
    []
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [logLimit, setLogLimit] = usePersistedState<number>(
    `${server.name}:log_limit`, 
    200
  );
  const [parsedLogs, setParsedLogs] = useState<LogLine[]>([]);
  const [websocketLogs, setWebsocketLogs] = useState<LogLine[]>([]);
  const [lastKnownStatus, setLastKnownStatus] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isConnected, subscribe } = useWebSocketContext();
  const queryClient = useQueryClient();
  const prevIsConnectedRef = useRef(isConnected);

  const { data: logsFetched, isLoading } = useQuery(
    orpc.atlas.getServerLogs.queryOptions({
      input: { server: server.serverId, lines: logLimit },
    })
  );

  // When the WebSocket reconnects, clear stale state and reload logs from the API
  useEffect(() => {
    if (isConnected && !prevIsConnectedRef.current) {
      setWebsocketLogs([]);
      setLastKnownStatus(null);
      queryClient.invalidateQueries({
        queryKey: orpc.atlas.getServerLogs.queryOptions({
          input: { server: server.serverId, lines: logLimit },
        }).queryKey,
      });
    }
    prevIsConnectedRef.current = isConnected;
  }, [isConnected, queryClient, server.serverId, logLimit]);

  // Parse logs when fetched data changes
  useEffect(() => {
    if (logsFetched?.logs) {
      const rawLogString = logsFetched.logs.join("\n");
      const parsed = parseLogs(rawLogString);
      setParsedLogs(parsed);
    } else {
      setParsedLogs([]);
    }
  }, [logsFetched]);

  // Handle scroll detection
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = Math.abs(scrollTop + clientHeight - scrollHeight) <= 5;
    setAutoScroll(isAtBottom);
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      const container = containerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [parsedLogs, websocketLogs, autoScroll]);

  // Command input handling
  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      const newIndex = Math.min(historyIndex + 1, history!.length - 1);
      setHistoryIndex(newIndex);
      e.currentTarget.value = history![newIndex] || "";
      e.preventDefault();
    }

    if (e.key === "ArrowDown") {
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      e.currentTarget.value = history![newIndex] || "";
    }

    const command = e.currentTarget.value;
    if (e.key === "Enter" && command.length > 0) {
      setHistory((prevHistory) => [command, ...prevHistory!].slice(0, 32));
      setHistoryIndex(-1);

      if (isConnected) {
        sendMessage({
          type: "server-command",
          command: command,
          id: crypto.randomUUID(),
        });
      }

      e.currentTarget.value = "";
      e.currentTarget.focus();
    }
  };

  // WebSocket subscription for real-time logs
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "log" && message.serverId === server.serverId) {
        let rawLogLine = message.message;
        if (typeof rawLogLine === "string" && rawLogLine.trim()) {
          // Remove leading colon and space if present
          if (rawLogLine.startsWith(": ")) {
            rawLogLine = rawLogLine.substring(2);
          }
          const parsed = parseLogs(rawLogLine);
          if (parsed.length > 0) {
            setWebsocketLogs((prev) => [...prev, ...parsed].slice(-200)); // Keep last 200 WS logs
          }
        }
      } else if (
        message.type === "status-update" &&
        message.serverId === server.serverId
      ) {
        const newStatus = message.data?.status;
        if (newStatus && newStatus !== lastKnownStatus) {
          setLastKnownStatus(newStatus);
          
          const statusLog: LogLine = {
            rawTimestamp: null,
            timestamp: new Date(),
            message: `Server is now ${newStatus.toLowerCase()}`,
          };
          
          setWebsocketLogs((prev) => [...prev, statusLog].slice(-200));
        }
      }
    });

    return unsubscribe;
  }, [subscribe, server.serverId, lastKnownStatus]);

  const status = lastKnownStatus ?? server.serverInfo?.status ?? "UNKNOWN";
  const isRunning = status === "RUNNING";
  const allLogs = [...parsedLogs, ...websocketLogs];
  
  // Filter logs based on search term
  const filteredLogs = searchTerm
    ? allLogs.filter((log) =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allLogs;

  return (
    <Card className="py-0">
      <CardContent className="p-0">
        {/* Search input */}
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Console output */}
        <div
          ref={containerRef}
          className="console-container relative h-[300px] overflow-x-hidden overflow-y-auto rounded-md p-3 pb-2 font-mono text-xs sm:h-[400px] sm:p-6 sm:pb-4 lg:h-[508px]"
          style={{
            scrollbarWidth: (isLoading && allLogs.length === 0) ? "none" : "thin",
            msOverflowStyle: (isLoading && allLogs.length === 0) ? "none" : "auto",
            scrollBehavior: "auto",
          }}
          onScroll={handleScroll}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
              .console-container::-webkit-scrollbar {
                width: ${(isLoading && allLogs.length === 0) ? "0px" : "8px"};
                opacity: ${(isLoading && allLogs.length === 0) ? "0" : "1"};
                transition: opacity 200ms ease;
              }
              .console-container::-webkit-scrollbar-track {
                background: transparent;
              }
              .console-container::-webkit-scrollbar-thumb {
                background-color: rgba(156, 163, 175, 0.5);
                border-radius: 4px;
              }
              .console-container::-webkit-scrollbar-thumb:hover {
                background-color: rgba(156, 163, 175, 0.7);
              }
            `,
            }}
          />
          {isLoading && allLogs.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2Icon className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <p>{searchTerm ? "No logs match your search" : "No logs available"}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredLogs.map((log, index) => (
                <TerminalLine
                  key={`${log.timestamp?.getTime() || "no-time"}-${index}`}
                  log={log}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
        </div>

        {/* Command input and controls */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              onKeyDown={handleCommandKeyDown}
              placeholder={
                !isConnected
                  ? "Connecting to server..."
                  : !isRunning
                    ? "Server must be running to send commands"
                    : "Enter server command..."
              }
              className="flex-1"
              disabled={!isRunning || isLoading || !isConnected}
            />
            <Select
              value={logLimit?.toString() || "200"}
              onValueChange={(value) => setLogLimit(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="200" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="300">300</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1K</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerConsole;
