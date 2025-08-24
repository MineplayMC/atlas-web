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
import { useSetup } from "@/contexts/setup-context";
import { useAtlasTestMutation } from "@/hooks/mutations/use-atlas-test-mutation";

const atlasSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL").min(1, "Base URL is required"),
  atlasUrl: z
    .string()
    .url("Must be a valid URL")
    .min(1, "Atlas URL is required"),
  atlasApiKey: z.string().min(1, "API Key is required"),
});

type AtlasFormValues = z.infer<typeof atlasSchema>;

const AtlasConfigPage = () => {
  const { state, updateAtlasConfig, setCurrentStep } = useSetup();
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const atlasTestMutation = useAtlasTestMutation(
    () => {
      setTestSuccess(true);
      setTestError(null);
    },
    (error) => {
      setTestSuccess(false);
      setTestError(error.message);
    }
  );

  useEffect(() => {
    setCurrentStep(3);
  }, [setCurrentStep]);

  const form = useForm<AtlasFormValues>({
    resolver: zodResolver(atlasSchema),
    defaultValues: {
      baseUrl: state.atlasConfig.baseUrl || window.location.origin,
      atlasUrl: state.atlasConfig.atlasUrl || "",
      atlasApiKey: state.atlasConfig.atlasApiKey || "",
    },
  });

  useEffect(() => {
    const formData = {
      baseUrl: state.atlasConfig.baseUrl || window.location.origin,
      atlasUrl: state.atlasConfig.atlasUrl || "",
      atlasApiKey: state.atlasConfig.atlasApiKey || "",
    };

    form.reset(formData);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: AtlasFormValues) => {
    updateAtlasConfig(values);
    handleTest(values);
  };

  const handleTest = async (values?: AtlasFormValues) => {
    setTestError(null);
    setTestSuccess(false);

    const formValues = values || form.getValues();

    atlasTestMutation.mutate({
      baseUrl: formValues.atlasUrl,
      apiKey: formValues.atlasApiKey,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Atlas Configuration</h2>
        <p className="text-muted-foreground">
          Configure your Atlas API connection and base URLs
        </p>
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
            name="baseUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder={window.location.origin}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updateAtlasConfig({ baseUrl: e.target.value });
                    }}
                  />
                </FormControl>
                <FormDescription>
                  The base URL where this Atlas instance will be accessible
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
                    onChange={(e) => {
                      field.onChange(e);
                      updateAtlasConfig({ atlasUrl: e.target.value });
                    }}
                  />
                </FormControl>
                <FormDescription>
                  The URL of your Atlas backend API server
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
                <FormLabel>Atlas API Key</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="•••••••••••••••••••••"
                    autoComplete="new-password"
                    data-1p-ignore
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updateAtlasConfig({ atlasApiKey: e.target.value });
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Your Atlas API authentication key
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 pt-4">
            <Button
              type="submit"
              disabled={atlasTestMutation.isPending}
              variant="outline"
            >
              {atlasTestMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>

            {testError && (
              <div className="bg-destructive/10 text-destructive border-destructive/30 rounded-lg border p-3">
                <p className="text-sm font-medium">Connection Test Failed</p>
                <p className="mt-1 text-sm">{testError}</p>
              </div>
            )}

            {testSuccess && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">✓ Connection successful</p>
                <p className="mt-1 text-sm">
                  Successfully connected to Atlas API.
                </p>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export const Route = createFileRoute("/setup/atlas")({
  component: AtlasConfigPage,
});
