/// <reference types="vite/client" />
import * as React from "react";

import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import { UploadProgressProvider } from "@/contexts/upload-progress-context";
import { authQueryOptions } from "@/features/auth/services/auth.query";
import { setupStatusQueryOptions } from "@/hooks/queries/use-setup-status-query";
import { useSetupStatus } from "@/hooks/use-setup-status";
import appCss from "@/styles/globals.css?url";
import { seo } from "@/utils/seo";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const setup = useSetupStatus();

  const primaryColor =
    setup.config?.brandingConfig.primaryColor || "30, 56%, 65%";
  const backgroundImage =
    setup.config?.brandingConfig.backgroundImage || "/bg-darker.jpg";

  return (
    <html
      style={{
        "--primary-plain": primaryColor,
        "--background-image": `url(${backgroundImage})`,
      }}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <style>
          @import
          url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Rubik:ital,wght@0,300..900;1,300..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap");
        </style>
      </head>
      <body className="min-h-screen min-w-full antialiased">
        <ThemeProvider
          defaultTheme="system"
          enableColorScheme
          enableSystem
          attribute="class"
        >
          <UploadProgressProvider>
            <Toaster richColors />
            {children}
            <ReactQueryDevtools buttonPosition="bottom-right" />
          </UploadProgressProvider>
        </ThemeProvider>

        <Scripts />
      </body>
    </html>
  );
};

const RootComponent = () => {
  return (
    <RootLayout>
      <Outlet />
    </RootLayout>
  );
};

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(authQueryOptions());
    const config = await context.queryClient.ensureQueryData(
      setupStatusQueryOptions()
    );

    return {
      auth,
      config,
    };
  },
  loader: async ({ context }) => {
    return {
      auth: context.auth,
      config: context.config,
    };
  },
  head: ({ loaderData }) => {
    const favicon =
      loaderData?.config?.config?.brandingConfig?.favicon || "/favicon.ico";
    const faviconExtension = favicon.split(".").pop()?.toLowerCase();
    const mimeType =
      faviconExtension === "svg"
        ? "image/svg+xml"
        : faviconExtension === "png"
          ? "image/png"
          : "image/x-icon";

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        ...seo({
          title: "Atlas | Game Server Management Dashboard",
          description:
            "Atlas is a comprehensive game server management platform providing real-time monitoring, auto-scaling, and administration capabilities for gaming networks and server infrastructure.",
        }),
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: favicon,
        },
        {
          rel: "icon",
          type: mimeType,
          sizes: "32x32",
          href: favicon,
        },
        {
          rel: "icon",
          type: mimeType,
          sizes: "16x16",
          href: favicon,
        },
        { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
        { rel: "icon", href: favicon, type: mimeType },
      ],
    };
  },
  errorComponent: (props) => {
    return (
      <RootLayout>
        <DefaultCatchBoundary {...props} />
      </RootLayout>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});
