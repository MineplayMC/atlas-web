import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { setupStatusQueryOptions } from "@/hooks/queries/use-setup-status-query";

const RouteComponent = () => {
  return (
    <div className="site-container">
      <div className="content-container flex flex-grow items-center justify-center">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_auth")({
  loader: async ({ context }) => {
    const setupStatus = await context.queryClient.ensureQueryData(setupStatusQueryOptions());
    if (!setupStatus.isCompleted) {
      return redirect({ to: "/setup" });
    }
  },
  component: RouteComponent,
});
