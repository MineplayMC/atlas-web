import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import BottomTabbar from "@/components/bottom-tabbar";
import Header from "@/components/header";
import { setupStatusQueryOptions } from "@/hooks/queries/use-setup-status-query";

const RouteComponent = () => {
  return (
    <div className="site-container">
      <Header />

      <div className="content-container flex-grow">
        <div className="mx-auto w-full max-w-7xl flex-row justify-between px-4 sm:px-8 md:flex">
          <div className="h-fit w-full pb-20 sm:pb-0">
            {/* <NextTopLoader color="#D4A373" /> */}
            <Outlet />
          </div>
        </div>
      </div>

      <BottomTabbar />
    </div>
  );
};

export const Route = createFileRoute("/_main")({
  loader: async ({ context }) => {
    const setupStatus = await context.queryClient.ensureQueryData(
      setupStatusQueryOptions()
    );
    if (!setupStatus.isCompleted) {
      return redirect({ to: "/setup" });
    }

    if (!context.auth.isAuthenticated) {
      return redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});
