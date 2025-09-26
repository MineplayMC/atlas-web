import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { BarChart3, FileText, Shield, Users, Database, Globe, Palette, Settings } from "lucide-react";

import { setupStatusQueryOptions } from "@/hooks/queries/use-setup-status-query";
import { useSetupStatus } from "@/hooks/use-setup-status";
import { cn } from "@/lib/utils";

const adminNavItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: BarChart3,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    icon: FileText,
  },
  {
    title: "Configuration",
    icon: Settings,
    children: [
      {
        title: "Database",
        href: "/admin/database-config",
        icon: Database,
      },
      {
        title: "Authentication",
        href: "/admin/auth-config",
        icon: Shield,
      },
      {
        title: "Atlas API",
        href: "/admin/atlas-config",
        icon: Globe,
      },
      {
        title: "Branding",
        href: "/admin/branding-config",
        icon: Palette,
      },
    ],
  },
];

const RouteComponent = () => {
  const location = useLocation();
  const config = useSetupStatus();

  return (
    <div className="bg-background flex min-h-screen">
      <div className="bg-card/50 w-64 border-r backdrop-blur-sm">
        <Link to="/" className="flex h-16 items-center border-b px-6">
          <div className="flex items-center gap-2">
            <Shield className="text-primary h-6 w-6" />
            <h1 className="text-lg font-semibold">
              {config.config?.brandingConfig?.displayName || "Atlas"} Admin
            </h1>
          </div>
        </Link>

        <nav className="p-4">
          <ul className="space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;

              if (item.children) {
                return (
                  <li key={item.title}>
                    <div className="mb-2">
                      <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                        <Icon className="h-3 w-3" />
                        {item.title}
                      </div>
                    </div>
                    <ul className="ml-3 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isActive =
                          location.pathname === child.href ||
                          (child.href !== "/admin" &&
                            location.pathname.startsWith(child.href));

                        return (
                          <li key={child.href}>
                            <Link
                              to={child.href}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {child.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              }

              const isActive =
                location.pathname === item.href ||
                (item.href !== "/admin" &&
                  location.pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="bg-card/30 h-16 border-b backdrop-blur-sm">
          <div className="flex h-full items-center px-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {(() => {
                  for (const item of adminNavItems) {
                    if (item.href && location.pathname === item.href) {
                      return item.title;
                    }
                    if (item.children) {
                      const child = item.children.find(
                        (c) => location.pathname === c.href
                      );
                      if (child) return child.title;
                    }
                  }
                  return "Dashboard";
                })()}
              </h2>
            </div>
          </div>
        </div>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/admin")({
  loader: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      return redirect({ to: "/login" });
    }

    const setupStatus = await context.queryClient.ensureQueryData(
      setupStatusQueryOptions()
    );
    if (!setupStatus.isCompleted) {
      return redirect({ to: "/setup" });
    }
  },
  component: RouteComponent,
});
