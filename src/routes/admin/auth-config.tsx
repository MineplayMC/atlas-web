import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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
      provider: "oidc",
      providerName: "",
      clientId: "",
      clientSecret: "",
      authorizationUrl: "",
      tokenUrl: "",
      userInfoUrl: "",
    },
  });

  // Reset form when config loads
  React.useEffect(() => {
    if (currentConfig?.oidcConfig) {
      form.reset({
        provider: currentConfig.oidcConfig.provider || "oidc",
        providerName: currentConfig.oidcConfig.providerName || "",
        clientId: currentConfig.oidcConfig.clientId || "",
        clientSecret: "",
        authorizationUrl: currentConfig.oidcConfig.authorizationUrl || "",
        tokenUrl: currentConfig.oidcConfig.tokenUrl || "",
        userInfoUrl: currentConfig.oidcConfig.userInfoUrl || "",
      });
    }
  }, [currentConfig, form]);

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
          description: "Authentication configuration has been updated successfully. Please restart the server for changes to take effect.",
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
      keycloak: {
        providerName: "Keycloak",
        authorizationUrl: "https://your-keycloak.com/realms/{realm}/protocol/openid-connect/auth",
        tokenUrl: "https://your-keycloak.com/realms/{realm}/protocol/openid-connect/token",
        userInfoUrl: "https://your-keycloak.com/realms/{realm}/protocol/openid-connect/userinfo",
      },
      auth0: {
        providerName: "Auth0",
        authorizationUrl: "https://{tenant}.auth0.com/authorize",
        tokenUrl: "https://{tenant}.auth0.com/oauth/token",
        userInfoUrl: "https://{tenant}.auth0.com/userinfo",
      },
      okta: {
        providerName: "Okta",
        authorizationUrl: "https://{domain}.okta.com/oauth2/default/v1/authorize",
        tokenUrl: "https://{domain}.okta.com/oauth2/default/v1/token",
        userInfoUrl: "https://{domain}.okta.com/oauth2/default/v1/userinfo",
      },
      oidc: {
        providerName: "Custom OIDC",
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
            Configure your OIDC authentication provider settings. Changes will require a server restart.
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
                        onValueChange={handleProviderChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="oidc">Custom OIDC</SelectItem>
                          <SelectItem value="keycloak">Keycloak</SelectItem>
                          <SelectItem value="auth0">Auth0</SelectItem>
                          <SelectItem value="okta">Okta</SelectItem>
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
                      <FormDescription>
                        OIDC token endpoint URL
                      </FormDescription>
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
              </div>

              {testResult && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
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
  component: RouteComponent,
});