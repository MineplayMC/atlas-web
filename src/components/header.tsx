import React, { useCallback, useMemo } from "react";

import { Link } from "@tanstack/react-router";
import {
  FileText,
  LayoutDashboardIcon,
  Server,
  Settings,
  UserIcon,
  Users,
} from "lucide-react";

import { useAuthedQuery } from "@/features/auth/services/auth.query";
import { useSetupStatus } from "@/hooks/use-setup-status";
import { authClient } from "@/lib/auth-client";

const Header = React.memo(() => {
  const { data: session } = useAuthedQuery();
  const config = useSetupStatus();

  const userRole = (session.user as any).role;

  const links = useMemo(() => {
    const baseLinks = [
      {
        name: "Overview",
        icon: LayoutDashboardIcon,
        to: "/",
      },
      {
        name: "Groups",
        icon: Users,
        to: "/groups",
      },
      {
        name: "Servers",
        icon: Server,
        to: "/servers",
      },
      {
        name: "Templates",
        icon: FileText,
        to: "/templates",
      },
    ];

    // Only show Admin link for admin users
    if (userRole === "admin") {
      baseLinks.push({
        name: "Admin",
        icon: Settings,
        to: "/admin",
      });
    }

    return baseLinks;
  }, [userRole]);

  const handleSignOut = useCallback(() => {
    authClient.signOut();
  }, []);

  return (
    <header className="site-header mb-4 sm:mb-0">
      <div className="main-with-min-height mx-auto mb-2 max-w-7xl px-4 sm:mb-4 sm:px-8">
        <div className="border-border border-b">
          <div className="flex flex-row items-center py-4 sm:py-6">
            <Link to="/" className="flex items-center gap-3 sm:gap-4">
              <img
                src={config.config?.brandingConfig?.logo || "/logo.png"}
                alt={config.config?.brandingConfig?.displayName || "Atlas"}
                className="h-6 w-6 sm:h-8 sm:w-8"
              />
              <p className="text-xl font-semibold sm:text-2xl">
                {config.config?.brandingConfig?.displayName || "Atlas"}
              </p>
            </Link>

            <div className="ml-8 hidden items-center gap-4 sm:flex lg:gap-6">
              {links.map((link) => (
                <Link
                  key={link.name}
                  to={link.to}
                  className="text-muted-foreground hover:text-foreground relative flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                  activeProps={{
                    className:
                      "!text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:translate-y-[25.5px]",
                  }}
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="relative">
                {session.user.image ? (
                  <img
                    className="h-8 w-8 rounded-full transition-opacity hover:cursor-pointer hover:opacity-80"
                    onClick={handleSignOut}
                    src={session.user.image}
                    alt="User Avatar"
                  />
                ) : (
                  <UserIcon
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground h-5 w-5 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";

export default Header;
