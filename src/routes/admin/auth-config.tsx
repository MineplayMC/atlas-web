import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, Shield, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { orpc } from "@/lib/orpc";

const authSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  providerName: z.string().min(1, "Provider name is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
  authorizationUrl: z.string().url("Must be a valid URL"),
  tokenUrl: z.string().url("Must be a valid URL"),
  userInfoUrl: z.string().url("Must be a valid URL"),
  scopes: z.array(z.string()).optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

const RouteComponent = () => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: currentConfig } = useQuery(orpc.admin.getConfig.queryOptions());

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      provider: currentConfig?.oidcConfig?.provider || "custom",
      providerName: currentConfig?.oidcConfig?.providerName || "",
      clientId: currentConfig?.oidcConfig?.clientId || "",
      clientSecret: "",
      authorizationUrl: currentConfig?.oidcConfig?.authorizationUrl || "",
      tokenUrl: currentConfig?.oidcConfig?.tokenUrl || "",
      userInfoUrl: currentConfig?.oidcConfig?.userInfoUrl || "",
      scopes: currentConfig?.oidcConfig?.scopes || ["openid", "profile", "email", "groups"],
    },
  });

  const testOidc = useMutation(
    orpc.admin.testOidcConnection.mutationOptions({
      onSuccess: (data) => {
        setTestResult(data);
        if (data.success) {
          toast.success("OIDC Test Successful", {
            description: data.message,
          });
        } else {
          toast.error("OIDC Test Failed", {
            description: data.message,
          });
        }
      },
    })
  );

  const updateConfig = useMutation(
    orpc.admin.updateAuthConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Configuration Updated", {
          description:
            "Authentication configuration has been updated successfully. Please restart the server for changes to take effect.",
        });
        form.reset(form.getValues());
      },
      onError: (error) => {
        toast.error("Update Failed", {
          description: error.message,
        });
      },
    })
  );

  const handleTest = () => {
    const values = form.getValues();
    testOidc.mutate({
      provider: values.provider,
      authorizationUrl: values.authorizationUrl,
      tokenUrl: values.tokenUrl,
      userInfoUrl: values.userInfoUrl,
      clientId: values.clientId,
    });
  };

  const onSubmit = (values: AuthFormValues) => {
    if (!testResult?.success) {
      toast.error("Test Required", {
        description: "Please test the OIDC configuration before saving.",
      });
      return;
    }
    updateConfig.mutate(values);
  };

  const handleProviderChange = (value: string) => {
    form.setValue("provider", value);

    const presets: Record<string, Partial<AuthFormValues>> = {
      google: {
        providerName: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
        scopes: ["openid", "profile", "email"],
      },
      github: {
        providerName: "GitHub",
        authorizationUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        userInfoUrl: "https://api.github.com/user",
        scopes: ["read:user", "user:email"],
      },
      discord: {
        providerName: "Discord",
        authorizationUrl: "https://discord.com/oauth2/authorize",
        tokenUrl: "https://discord.com/oauth2/token",
        userInfoUrl: "https://discord.com/users/@me",
        scopes: ["identify", "email", "guilds"],
      },
      custom: {
        providerName: "Custom Provider",
        scopes: ["openid", "profile", "email", "groups"],
      },
    };

    if (presets[value]) {
      Object.entries(presets[value]).forEach(([key, val]) => {
        form.setValue(key as keyof AuthFormValues, val as any);
      });
    }
  };

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Authentication Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure your OIDC authentication provider settings. Changes will
            require a server restart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleProviderChange(value);
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
                          <SelectItem value="custom">
                            Custom Provider
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select your authentication provider
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="providerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Keycloak" {...field} />
                      </FormControl>
                      <FormDescription>
                        Name shown on the login button
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input placeholder="your-client-id" {...field} />
                      </FormControl>
                      <FormDescription>
                        OAuth2/OIDC Client ID from your provider
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
                          placeholder="Enter client secret"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        OAuth2/OIDC Client Secret from your provider
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorizationUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Authorization URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://provider.com/auth"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        OIDC authorization endpoint URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Token URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://provider.com/token"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>OIDC token endpoint URL</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userInfoUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>User Info URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://provider.com/userinfo"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        OIDC user info endpoint URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scopes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>OAuth Scopes</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="openid profile email groups"
                          value={field.value?.join(" ") || ""}
                          onChange={(e) => {
                            const scopes = e.target.value
                              .split(" ")
                              .map(s => s.trim())
                              .filter(s => s.length > 0);
                            field.onChange(scopes);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Space-separated list of OAuth scopes to request
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {testResult && (
                <div
                  className={`flex items-center gap-2 rounded-lg p-3 ${
                    testResult.success
                      ? "bg-green-500/10 text-green-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testOidc.isPending || !form.formState.isValid}
                >
                  {testOidc.isPending ? "Testing..." : "Test Configuration"}
                </Button>
                <Button
                  type="submit"
                  disabled={updateConfig.isPending || !testResult?.success}
                >
                  {updateConfig.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/admin/auth-config")({
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      orpc.admin.getConfig.queryOptions()
    );
  },
  component: RouteComponent,
});
