import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useMutation } from "@tanstack/react-query";

import { useSetupStatus } from "@/hooks/use-setup-status";
import { orpc } from "@/lib/orpc";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionFailed: boolean;
  sendMessage: (_message: any) => void;
  subscribe: (_callback: (_message: WebSocketMessage) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const activeConnections = new Map<string, boolean>();

// Periodic cleanup of stale connections to prevent memory leaks
setInterval(() => {
  // Clear all connections periodically as they should be managed by component lifecycle
  if (activeConnections.size > 10) {
    activeConnections.clear();
  }
}, 300000); // Clean up every 5 minutes

interface WebSocketProviderProps {
  children: ReactNode;
  serverId: string;
}

export const WebSocketProvider = ({
  children,
  serverId,
}: WebSocketProviderProps) => {
  const config = useSetupStatus();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const subscribersRef = useRef<Set<(_message: WebSocketMessage) => void>>(
    new Set()
  );
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const tokenMutation = useMutation(
    orpc.atlas.getWebSocketToken.mutationOptions()
  );

  const connectRef = useRef<() => Promise<void>>(undefined);

  connectRef.current = async () => {
    if (
      isUnmountedRef.current ||
      isConnecting ||
      isConnected ||
      ws ||
      activeConnections.get(serverId)
    ) {
      return;
    }

    try {
      activeConnections.set(serverId, true);
      setIsConnecting(true);

      const tokenData = await tokenMutation.mutateAsync({ server: serverId });

      if (isUnmountedRef.current) {
        activeConnections.delete(serverId);
        setIsConnecting(false);
        return;
      }

      const wsUrl = `${config.config?.atlasConfig.websocketUrl}/api/v1/servers/${serverId}/ws?auth=${tokenData.token}`;
      const socket = new WebSocket(wsUrl);
      setWs(socket);

      socket.addEventListener("open", () => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionFailed(false);
        reconnectAttemptsRef.current = 0;
      });

      socket.addEventListener("message", (event) => {
        const data: WebSocketMessage = JSON.parse(event.data);

        if (data.type === "auth-challenge") {
          tokenMutation
            .mutateAsync({ server: serverId })
            .then((tokenData) => {
              socket.send(
                JSON.stringify({
                  type: "auth",
                  token: tokenData.token,
                })
              );
            })
            .catch(() => {
              socket.close();
            });
          return;
        }

        if (data.type === "auth-result") {
          if (
            data.success !== true &&
            data.message !== "Authentication successful"
          ) {
            socket.close();
          }
          return;
        }

        subscribersRef.current.forEach((callback) => {
          callback(data);
        });
      });

      socket.addEventListener("close", () => {
        setIsConnected(false);
        setIsConnecting(false);
        setWs(null);
        activeConnections.delete(serverId);

        if (!isUnmountedRef.current && reconnectAttemptsRef.current < 3) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectAttemptsRef.current++;

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              connectRef.current?.();
            }
          }, delay);
        } else if (!isUnmountedRef.current) {
          setConnectionFailed(true);
        }
      });

      socket.addEventListener("error", () => {
        setIsConnecting(false);
        setIsConnected(false);
        activeConnections.delete(serverId);
      });
    } catch {
      setIsConnecting(false);
      activeConnections.delete(serverId);
    }
  };

  const connect = useCallback(() => {
    connectRef.current?.();
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (ws) {
      ws.close();
    }

    setWs(null);
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
  }, [ws]);

  const sendMessage = useCallback(
    (message: any) => {
      if (!ws || !isConnected || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        ws.send(JSON.stringify(message));
      } catch {}
    },
    [ws, isConnected]
  );

  const subscribe = useCallback(
    (callback: (_message: WebSocketMessage) => void) => {
      subscribersRef.current.add(callback);

      return () => {
        subscribersRef.current.delete(callback);
      };
    },
    []
  );

  useEffect(() => {
    isUnmountedRef.current = false;
    connectRef.current?.();

    // Capture the subscribers ref value at effect run time
    const subscribers = subscribersRef.current;

    return () => {
      isUnmountedRef.current = true;

      // Clear all timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket connection properly
      if (ws) {
        // Remove event listeners before closing to prevent memory leaks
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }

      // Clean up active connections map
      activeConnections.delete(serverId);

      // Clear subscribers using captured reference
      subscribers.clear();

      // Reset all state
      setWs(null);
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionFailed(false);
      reconnectAttemptsRef.current = 0;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const value: WebSocketContextType = {
    isConnected,
    isConnecting,
    connectionFailed,
    sendMessage,
    subscribe,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider"
    );
  }
  return context;
};
