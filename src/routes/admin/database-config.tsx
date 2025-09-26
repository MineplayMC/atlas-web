import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Database, CheckCircle, XCircle } from "lucide-react";
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
import { orpc } from "@/lib/orpc";

const databaseSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535),
  database: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type DatabaseFormValues = z.infer<typeof databaseSchema>;

const RouteComponent = () => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: currentConfig } = useQuery(orpc.admin.getConfig.queryOptions());

  const form = useForm<DatabaseFormValues>({
    resolver: zodResolver(databaseSchema),
    defaultValues: {
      host: "localhost",
      port: 5432,
      database: "atlas",
      username: "postgres",
      password: "",
    },
  });

  // Reset form when config loads
  React.useEffect(() => {
    if (currentConfig?.postgresConfig) {
      form.reset({
        host: currentConfig.postgresConfig.host || "localhost",
        port: currentConfig.postgresConfig.port || 5432,
        database: currentConfig.postgresConfig.database || "atlas",
        username: currentConfig.postgresConfig.username || "postgres",
        password: "",
      });
    }
  }, [currentConfig, form]);

  const testConnection = useMutation(
    orpc.admin.testDatabaseConnection.mutationOptions({
      onSuccess: (data) => {
        setTestResult(data);
        if (data.success) {
          toast.success("Connection Successful", {
            description: data.message,
          });
        } else {
          toast.error("Connection Failed", {
            description: data.message,
          });
        }
      },
    })
  );

  const updateConfig = useMutation(
    orpc.admin.updateDatabaseConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Configuration Updated", {
          description: "Database configuration has been updated successfully. Please restart the server for changes to take effect.",
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
    testConnection.mutate(values);
  };

  const onSubmit = (values: DatabaseFormValues) => {
    if (!testResult?.success) {
      toast.error("Test Required", {
        description: "Please test the connection before saving.",
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
            <Database className="h-5 w-5" />
            <CardTitle>Database Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure your PostgreSQL database connection settings. Changes will require a server restart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host</FormLabel>
                      <FormControl>
                        <Input placeholder="localhost" {...field} />
                      </FormControl>
                      <FormDescription>
                        PostgreSQL server hostname or IP address
                      </FormDescription>
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
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        PostgreSQL server port (default: 5432)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="database"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Database Name</FormLabel>
                      <FormControl>
                        <Input placeholder="atlas" {...field} />
                      </FormControl>
                      <FormDescription>
                        Name of the PostgreSQL database
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="postgres" {...field} />
                      </FormControl>
                      <FormDescription>
                        Database user with necessary permissions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter database password"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Password for the database user
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

export const Route = createFileRoute("/admin/database-config")({
  component: RouteComponent,
});