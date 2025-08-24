import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetup } from "@/contexts/setup-context";
import { useOidcTestMutation } from "@/hooks/mutations/use-oidc-test-mutation";

const providers = {
  google: {
    name: "Google",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  github: {
    name: "GitHub",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
  },
  discord: {
    name: "Discord",
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
  },
  custom: {
    name: "Custom Provider",
    authorizationUrl: "",
    tokenUrl: "",
    userInfoUrl: "",
  },
};

const oidcSchema = z
  .object({
    provider: z.string().min(1, "Provider is required"),
    providerName: z.string().min(1, "Provider name is required"),
    clientId: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client Secret is required"),
    authorizationUrl: z
      .string()
      .url("Must be a valid URL")
      .min(1, "Authorization URL is required"),
    tokenUrl: z
      .string()
      .url("Must be a valid URL")
      .min(1, "Token URL is required"),
    userInfoUrl: z
      .string()
      .url("Must be a valid URL")
      .min(1, "User Info URL is required"),
  })
  .refine(
    (data) => {
      if (data.provider === "custom") {
        return data.providerName && data.providerName.trim().length > 0;
      }
      return true;
    },
    {
      message: "Provider name is required for custom providers",
      path: ["providerName"],
    }
  );

type OIDCFormValues = z.infer<typeof oidcSchema>;

const AuthPage = () => {
  const { state, updateOIDCConfig, setOIDCTestPassed, setCurrentStep } =
    useSetup();
  const [testError, setTestError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState(
    state.oidcConfig.provider || "discord"
  );

  const oidcTestMutation = useOidcTestMutation(
    () => {
      setOIDCTestPassed(true);
      setTestError(null);
    },
    (error) => {
      setOIDCTestPassed(false);
      setTestError(error.message);
    }
  );

  useEffect(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  const form = useForm<OIDCFormValues>({
    resolver: zodResolver(oidcSchema),
    defaultValues: {
      ...state.oidcConfig,
      provider: state.oidcConfig.provider || "discord",
    },
  });

  useEffect(() => {
    const provider = state.oidcConfig.provider || "discord";
    const formData = {
      ...state.oidcConfig,
      provider,
      providerName:
        provider !== "custom"
          ? providers[provider as keyof typeof providers]?.name ||
            state.oidcConfig.providerName
          : state.oidcConfig.providerName,
    };
    form.reset(formData);
    setSelectedProvider(provider);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    form.setValue("provider", provider);

    if (provider !== "custom") {
      const providerConfig = providers[provider as keyof typeof providers];
      form.setValue("providerName", providerConfig.name);
      form.setValue("authorizationUrl", providerConfig.authorizationUrl);
      form.setValue("tokenUrl", providerConfig.tokenUrl);
      form.setValue("userInfoUrl", providerConfig.userInfoUrl);
      updateOIDCConfig({
        provider,
        providerName: providerConfig.name,
        authorizationUrl: providerConfig.authorizationUrl,
        tokenUrl: providerConfig.tokenUrl,
        userInfoUrl: providerConfig.userInfoUrl,
      });
    }
  };

  const onSubmit = async (values: OIDCFormValues) => {
    updateOIDCConfig(values);
    handleTest(values);
  };

  const handleTest = async (values?: OIDCFormValues) => {
    setTestError(null);
    const formValues = values || form.getValues();

    oidcTestMutation.mutate({
      provider: formValues.provider,
      authorizationUrl: formValues.authorizationUrl,
      tokenUrl: formValues.tokenUrl,
      userInfoUrl: formValues.userInfoUrl,
      clientId: formValues.clientId,
    });
  };

  const getRedirectUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/auth/oauth2/callback/identity`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">
          Authentication Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure your OpenID Connect (OIDC) authentication provider
        </p>
      </div>

      <div className="bg-accent/50 border-primary/30 mb-4 rounded-lg border p-3">
        <p className="mb-1 text-sm font-semibold">Redirect URL</p>
        <p className="text-muted-foreground mb-2 text-sm">
          Configure this URL in your OAuth provider:
        </p>
        <code className="bg-background rounded px-2 py-1 text-xs">
          {getRedirectUrl()}
        </code>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          autoComplete="off"
          data-1p-ignore
        >
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    onProviderChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="custom">Custom Provider</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose your OAuth provider or select Custom for other
                  providers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedProvider === "custom" && (
            <FormField
              control={form.control}
              name="providerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My OAuth Provider"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updateOIDCConfig({ providerName: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Display name for this authentication provider
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="your-client-id"
                      autoComplete="off"
                      data-1p-ignore
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updateOIDCConfig({ clientId: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Your application's client identifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••••••••••"
                      autoComplete="new-password"
                      data-1p-ignore
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updateOIDCConfig({ clientSecret: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Your application's client secret
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {selectedProvider === "custom" && (
            <>
              <FormField
                control={form.control}
                name="authorizationUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authorization URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://identity.example.com/authorize"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          updateOIDCConfig({
                            authorizationUrl: e.target.value,
                          });
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      The OAuth authorization endpoint
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tokenUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://identity.example.com/token"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          updateOIDCConfig({ tokenUrl: e.target.value });
                        }}
                      />
                    </FormControl>
                    <FormDescription>The OAuth token endpoint</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userInfoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Info URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://identity.example.com/userinfo"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          updateOIDCConfig({ userInfoUrl: e.target.value });
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      The OAuth user info endpoint
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="space-y-3 pt-4">
            <Button
              type="submit"
              disabled={oidcTestMutation.isPending}
              variant="outline"
            >
              {oidcTestMutation.isPending ? "Testing..." : "Test Configuration"}
            </Button>

            {testError && (
              <div className="bg-destructive/10 text-destructive border-destructive/30 rounded-lg border p-3">
                <p className="text-sm font-medium">Configuration Test Failed</p>
                <p className="mt-1 text-sm">{testError}</p>
              </div>
            )}

            {state.oidcTestPassed && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">
                  ✓ Configuration successful
                </p>
                <p className="mt-1 text-sm">
                  OIDC provider connection has been verified successfully.
                </p>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export const Route = createFileRoute("/setup/auth")({
  component: AuthPage,
});
