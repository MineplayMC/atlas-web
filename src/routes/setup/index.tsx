import { createFileRoute } from "@tanstack/react-router";

const WelcomePage = () => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="mb-2 text-3xl font-bold">Welcome to Atlas</h2>
        <p className="text-muted-foreground text-lg">
          Let's get your game server management platform set up
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-muted/30 border-border rounded-lg border p-4">
          <h3 className="mb-2 text-lg font-semibold">What is Atlas?</h3>
          <p className="text-muted-foreground mb-3 text-sm">
            A comprehensive game server management platform for real-time
            monitoring and administration.
          </p>
          <ul className="text-muted-foreground space-y-1 text-sm">
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Centralized multi-server management</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Real-time monitoring & statistics</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>File management & configuration</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Player tracking & backups</span>
            </li>
          </ul>
        </div>

        <div className="bg-muted/30 border-border rounded-lg border p-4">
          <h3 className="mb-2 text-lg font-semibold">Setup Process</h3>
          <p className="text-muted-foreground mb-3 text-sm">
            We'll guide you through configuring:
          </p>
          <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
            <li>Database connection (PostgreSQL)</li>
            <li>Authentication provider (OIDC)</li>
            <li>Atlas API configuration</li>
            <li>Branding and customization</li>
          </ol>
        </div>
      </div>

      <div className="bg-accent/50 border-primary/30 rounded-lg border p-3">
        <p className="text-sm">
          <span className="font-semibold">Note:</span> Have your database
          credentials, OIDC details, and Atlas API key ready.
        </p>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/setup/")({
  component: WelcomePage,
});
