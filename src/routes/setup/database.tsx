import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSetup } from "@/contexts/setup-context";
import { usePostgresTestMutation } from "@/hooks/mutations/use-postgres-test-mutation";

const databaseSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535),
  database: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type DatabaseFormValues = z.infer<typeof databaseSchema>;

const DatabasePage = () => {
  const { state, updatePostgresConfig, setPostgresTestPassed, setCurrentStep } =
    useSetup();
  const [testError, setTestError] = useState<string | null>(null);

  const postgresTestMutation = usePostgresTestMutation(
    () => {
      setPostgresTestPassed(true);
      setTestError(null);
    },
    (error) => {
      setPostgresTestPassed(false);
      setTestError(error.message);
    }
  );

  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  const form = useForm<DatabaseFormValues>({
    resolver: zodResolver(databaseSchema),
    defaultValues: state.postgresConfig,
  });

  useEffect(() => {
    form.reset(state.postgresConfig);
  }, [form, state.postgresConfig]);

  const onSubmit = async (values: DatabaseFormValues) => {
    updatePostgresConfig(values);
    handleTest(values);
  };

  const handleTest = async (values?: DatabaseFormValues) => {
    setTestError(null);
    const formValues = values || form.getValues();

    postgresTestMutation.mutate({
      host: formValues.host,
      port: formValues.port,
      database: formValues.database,
      username: formValues.username,
      password: formValues.password,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Database Configuration</h2>
        <p className="text-muted-foreground">
          Configure your PostgreSQL database connection
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          autoComplete="off"
          data-1p-ignore
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="localhost"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updatePostgresConfig({ host: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="5432"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 5432;
                        field.onChange(value);
                        updatePostgresConfig({ port: value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="database"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Database Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="atlas"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updatePostgresConfig({ database: e.target.value });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="postgres"
                      autoComplete="off"
                      data-1p-ignore
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updatePostgresConfig({ username: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      data-1p-ignore
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updatePostgresConfig({ password: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3 pt-4">
            <Button
              type="submit"
              disabled={postgresTestMutation.isPending}
              variant="outline"
            >
              {postgresTestMutation.isPending
                ? "Testing..."
                : "Test Connection"}
            </Button>

            {testError && (
              <div className="bg-destructive/10 text-destructive border-destructive/30 rounded-lg border p-3">
                <p className="text-sm font-medium">Connection Test Failed</p>
                <p className="mt-1 text-sm">{testError}</p>
              </div>
            )}

            {state.postgresTestPassed && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                <p className="text-sm font-medium">✓ Connection successful</p>
                <p className="mt-1 text-sm">
                  Database connection has been verified successfully.
                </p>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export const Route = createFileRoute("/setup/database")({
  component: DatabasePage,
});
