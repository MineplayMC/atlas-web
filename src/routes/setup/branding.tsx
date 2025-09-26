import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import * as z from "zod";

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

const brandingSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  backgroundImage: z.string().optional(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const BrandingPage = () => {
  const { state, updateBrandingConfig, setCurrentStep } = useSetup();
  const [logoUrlInput, setLogoUrlInput] = useState(
    state.brandingConfig.logo || ""
  );
  const [faviconUrlInput, setFaviconUrlInput] = useState(
    state.brandingConfig.favicon || ""
  );
  const [backgroundUrlInput, setBackgroundUrlInput] = useState(
    state.brandingConfig.backgroundImage || ""
  );

  const debouncedLogoUrl = useDebounce(logoUrlInput, 500);
  const debouncedFaviconUrl = useDebounce(faviconUrlInput, 500);
  const debouncedBackgroundUrl = useDebounce(backgroundUrlInput, 500);

  useEffect(() => {
    setCurrentStep(4);
  }, [setCurrentStep]);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: state.brandingConfig,
  });

  useEffect(() => {
    form.reset(state.brandingConfig);
    setLogoUrlInput(state.brandingConfig.logo || "");
    setFaviconUrlInput(state.brandingConfig.favicon || "");
    setBackgroundUrlInput(state.brandingConfig.backgroundImage || "");
  }, [form, state.brandingConfig]);

  const onSubmit = async (values: BrandingFormValues) => {
    updateBrandingConfig(values);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Branding & Customization</h2>
        <p className="text-muted-foreground">
          Customize the appearance of your Atlas instance
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Atlas"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updateBrandingConfig({ displayName: e.target.value });
                    }}
                  />
                </FormControl>
                <FormDescription>
                  The name that will be displayed throughout the application
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="https://example.com/logo.png"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setLogoUrlInput(e.target.value);
                          updateBrandingConfig({ logo: e.target.value });
                        }}
                      />
                      {debouncedLogoUrl && (
                        <div className="bg-muted flex items-center justify-center rounded-lg p-4">
                          <img
                            src={debouncedLogoUrl}
                            alt="Logo preview"
                            className="h-16 w-16 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                            onLoad={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "block";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    URL to your organization's logo image
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="favicon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favicon URL</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="https://example.com/favicon.ico"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setFaviconUrlInput(e.target.value);
                          updateBrandingConfig({ favicon: e.target.value });
                        }}
                      />
                      {debouncedFaviconUrl && (
                        <div className="bg-muted flex items-center justify-center rounded-lg p-4">
                          <img
                            src={debouncedFaviconUrl}
                            alt="Favicon preview"
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                            onLoad={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "block";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    URL to your favicon image (supports .ico, .png, .svg)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="h-10 w-16 cursor-pointer p-1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          updateBrandingConfig({
                            primaryColor: e.target.value,
                          });
                        }}
                      />
                      <Input
                        type="text"
                        placeholder="#3b82f6"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          updateBrandingConfig({
                            primaryColor: e.target.value,
                          });
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Main theme color for the application
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="backgroundImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Background Image URL</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      placeholder="https://example.com/background.jpg"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setBackgroundUrlInput(e.target.value);
                        updateBrandingConfig({
                          backgroundImage: e.target.value,
                        });
                      }}
                    />
                    {debouncedBackgroundUrl && (
                      <div className="bg-muted relative h-32 overflow-hidden rounded-lg">
                        <img
                          src={debouncedBackgroundUrl}
                          alt="Background preview"
                          className="h-full w-full object-cover opacity-50"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          onLoad={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "block";
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-sm font-medium">
                            Background Preview
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  URL to background image for login and setup pages
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
};

export const Route = createFileRoute("/setup/branding")({
  component: BrandingPage,
});
