import { useState } from "react";

import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { CheckCircle, XCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SetupProvider, useSetup } from "@/contexts/setup-context";
import { useSetupSaveMutation } from "@/hooks/mutations/use-setup-save-mutation";
import { setupStatusQueryOptions } from "@/hooks/queries/use-setup-status-query";

const SetupSteps = () => {
  const { state, setCurrentStep, canProceedToStep } = useSetup();
  const navigate = useNavigate();

  const steps = [
    { id: 0, name: "Welcome", path: "/setup" },
    { id: 1, name: "Database", path: "/setup/database" },
    { id: 2, name: "Authentication", path: "/setup/auth" },
    { id: 3, name: "Atlas Config", path: "/setup/atlas" },
    { id: 4, name: "Branding", path: "/setup/branding" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === state.currentStep);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      if (canProceedToStep(nextStep.id)) {
        setCurrentStep(nextStep.id);
        navigate({ to: nextStep.path });
      }
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      setCurrentStep(prevStep.id);
      navigate({ to: prevStep.path });
    }
  };

  const [setupComplete, setSetupComplete] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const setupSaveMutation = useSetupSaveMutation(
    () => setSetupComplete(true),
    (error) => setSetupError(error.message)
  );

  const handleFinish = async () => {
    if (!state.postgresTestPassed) {
      setSetupError(
        "Database connection test must pass before completing setup"
      );
      return;
    }
    if (!state.oidcTestPassed) {
      setSetupError(
        "Authentication configuration test must pass before completing setup"
      );
      return;
    }

    setSetupError(null);
    setupSaveMutation.mutate({
      postgresConfig: state.postgresConfig,
      oidcConfig: state.oidcConfig,
      atlasConfig: state.atlasConfig,
      brandingConfig: state.brandingConfig,
    });
  };

  const CompletionScreen = () => {
    if (setupError) {
      return (
        <div className="space-y-4 text-center">
          <div className="mb-6">
            <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <XCircle className="text-destructive h-8 w-8" />
            </div>
            <h2 className="text-destructive mb-2 text-2xl font-bold">
              Setup Failed
            </h2>
            <p className="text-muted-foreground">
              There was an error completing the setup process.
            </p>
          </div>

          <div className="bg-destructive/10 text-destructive border-destructive/30 rounded-lg border p-4">
            <p className="text-sm font-medium">Error Details</p>
            <p className="mt-1 text-sm">{setupError}</p>
          </div>

          <Button
            onClick={() => {
              setSetupError(null);
              setSetupComplete(false);
            }}
            variant="outline"
          >
            Go Back
          </Button>
        </div>
      );
    }

    if (setupComplete) {
      return (
        <div className="space-y-6 text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-green-600 dark:text-green-400">
              Setup Complete!
            </h2>
            <p className="text-muted-foreground">
              Your Atlas instance has been configured successfully.
            </p>
          </div>

          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <h3 className="mb-2 text-sm font-semibold">
              Configuration Summary
            </h3>
            <ul className="space-y-1 text-left text-sm">
              <li>
                ✓ Database: {state.postgresConfig.host}:
                {state.postgresConfig.port}
              </li>
              <li>✓ Authentication: {state.oidcConfig.providerName}</li>
              <li>✓ Atlas API: {state.atlasConfig.atlasUrl || "Configured"}</li>
              <li>✓ Branding: {state.brandingConfig.displayName}</li>
            </ul>
          </div>

          <Link to="/login" className={buttonVariants()}>
            Proceed to Atlas Dashboard
          </Link>
        </div>
      );
    }

    return null;
  };

  if (setupComplete || setupError) {
    return (
      <div className="site-container">
        <div className="content-container flex flex-grow items-center justify-center py-8">
          <div className="w-full max-w-2xl px-4">
            <div className="mb-6 flex items-center justify-center">
              <img src="/logo.png" alt="Atlas" className="mr-3 h-12 w-12" />
              <h1 className="text-3xl font-bold">Atlas Setup</h1>
            </div>

            <div className="bg-card rounded-lg p-8 shadow-lg">
              <CompletionScreen />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container">
      <div className="content-container flex flex-grow items-center justify-center py-8">
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col px-4">
          <div className="mb-6 flex-shrink-0">
            <div className="mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="Atlas" className="mr-3 h-12 w-12" />
              <h1 className="text-3xl font-bold">Atlas Setup</h1>
            </div>

            <div className="bg-card rounded-lg p-3 shadow-lg">
              <div className="mb-2 flex justify-between text-sm">
                {steps.map((step, index) => (
                  <span
                    key={step.id}
                    className={`${
                      index <= currentStepIndex
                        ? "text-primary font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                ))}
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          <div className="bg-card mb-4 overflow-hidden rounded-lg shadow-lg">
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <Outlet />
            </div>
          </div>

          <div className="flex flex-shrink-0 justify-between">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentStepIndex === 0}
            >
              Previous
            </Button>

            {currentStepIndex === steps.length - 1 ? (
              <Button
                onClick={handleFinish}
                disabled={setupSaveMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {setupSaveMutation.isPending
                  ? "Finishing Setup..."
                  : "Finish Setup"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceedToStep(steps[currentStepIndex + 1]?.id)}
                className="bg-primary hover:bg-primary/90"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SetupLayout = () => {
  return (
    <SetupProvider>
      <SetupSteps />
    </SetupProvider>
  );
};

export const Route = createFileRoute("/setup")({
  loader: async ({ context }) => {
    const setupStatus = await context.queryClient.ensureQueryData(
      setupStatusQueryOptions()
    );
    if (setupStatus.isCompleted) {
      return redirect({ to: "/login" });
    }
  },
  component: SetupLayout,
});
