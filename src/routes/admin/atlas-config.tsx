import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";

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
import { toast } from "sonner";
import { orpc } from "@/lib/orpc";

const atlasSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL"),
  atlasUrl: z.string().url("Must be a valid URL"),
  atlasApiKey: z.string().min(1, "API key is required"),
});

type AtlasFormValues = z.infer<typeof atlasSchema>;

const RouteComponent = () => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const { data: currentConfig } = useQuery(orpc.admin.getConfig.queryOptions());

  const form = useForm<AtlasFormValues>({
    resolver: zodResolver(atlasSchema),
    defaultValues: {
      baseUrl: window.location.origin,
      atlasUrl: "",
      atlasApiKey: "",
    },
  });

  // Reset form when config loads
  React.useEffect(() => {
    if (currentConfig?.atlasConfig) {
      form.reset({
        baseUrl: currentConfig.atlasConfig.baseUrl || window.location.origin,
        atlasUrl: currentConfig.atlasConfig.atlasUrl || "",
        atlasApiKey: "",
      });
    }
  }, [currentConfig, form]);

  const testConnection = useMutation(
    orpc.admin.testAtlasConnection.mutationOptions({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success("Atlas API Test Successful", {
          description: data.message,
        });
      } else {
        toast.error("Atlas API Test Failed", {
          description: data.message,
        });
      }
    },
    })
  );

  const updateConfig = useMutation(
    orpc.admin.updateAtlasConfig.mutationOptions({
    onSuccess: () => {
      toast.success("Configuration Updated", {
        description: "Atlas API configuration has been updated successfully. Please restart the server for changes to take effect.",
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
    testConnection.mutate({
      baseUrl: values.atlasUrl,
      apiKey: values.atlasApiKey,
    });
  };

  const onSubmit = (values: AtlasFormValues) => {
    if (!testResult?.success) {
      toast.error("Test Required", {
        description: "Please test the Atlas API connection before saving.",
      });
      return;
    }
    updateConfig.mutate(values);
  };

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Atlas API Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the connection to your Atlas API server. Changes will require a server restart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://atlas.example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The base URL where this Atlas instance is hosted
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="atlasUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atlas API URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://api.atlas.example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The URL of your Atlas API server
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="atlasApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your Atlas API key"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your Atlas API authentication key
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {testResult && (
                <div
                  className={`p-3 rounded-lg ${
                    testResult.success
                      ? "bg-green-500/10 text-green-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">{testResult.message}</span>
                  </div>
                  {testResult.data && (
                    <div className="text-xs space-y-1 ml-6">
                      <div>Version: {testResult.data.version || "Unknown"}</div>
                      <div>Status: {testResult.data.status || "Unknown"}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testConnection.isPending || !form.formState.isValid}
                >
                  {testConnection.isPending ? "Testing..." : "Test Connection"}
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

export const Route = createFileRoute("/admin/atlas-config")({
  component: RouteComponent,
});