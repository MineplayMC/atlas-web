import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
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

const brandingSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  logo: z.string().optional(),
  primaryColor: z.string().regex(
    /^#[0-9A-F]{6}$/i,
    "Must be a valid hex color (e.g., #FF6A3D)"
  ),
  backgroundImage: z.string().optional(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

const RouteComponent = () => {
  const { data: currentConfig } = useQuery(orpc.admin.getConfig.queryOptions());

  const convertFromHslValues = (color: string): string => {
    if (!color) return "#FF6A3D";

    // If it's already a hex color, return it
    if (color.startsWith("#")) {
      return color;
    }

    // Parse HSL format like "30, 56%, 65%"
    const match = color.match(/(\d+),\s*(\d+)%,\s*(\d+)%/);
    if (!match) return "#FF6A3D";

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      displayName: currentConfig?.brandingConfig?.displayName || "Atlas",
      logo: currentConfig?.brandingConfig?.logo || "/logo.png",
      primaryColor: currentConfig?.brandingConfig?.primaryColor
        ? convertFromHslValues(currentConfig.brandingConfig.primaryColor)
        : "#FF6A3D",
      backgroundImage: currentConfig?.brandingConfig?.backgroundImage || "",
    },
  });

  const updateConfig = useMutation(
    orpc.admin.updateBrandingConfig.mutationOptions({
    onSuccess: () => {
      toast.success("Configuration Updated", {
        description: "Branding configuration has been updated successfully. Changes will be visible on page refresh.",
      });
      form.reset(form.getValues());
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error) => {
      toast.error("Update Failed", {
        description: error.message,
      });
    },
    })
  );

  const onSubmit = (values: BrandingFormValues) => {
    updateConfig.mutate(values);
  };

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Branding Configuration</CardTitle>
          </div>
          <CardDescription>
            Customize the appearance of your Atlas instance. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Atlas" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name displayed in the header and login page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="/logo.png" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL or path to your logo image
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
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="#FF6A3D"
                          {...field}
                          className="flex-1"
                        />
                      </FormControl>
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: field.value }}
                      />
                    </div>
                    <FormDescription>
                      Primary brand color in hex format (e.g., #FF6A3D)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backgroundImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/background.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL or path to a background image for the login page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Preview</h4>
                <div className="flex items-center gap-2">
                  {form.watch("logo") && (
                    <img
                      src={form.watch("logo")}
                      alt="Logo preview"
                      className="h-8 w-8"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <span
                    className="text-lg font-semibold"
                    style={{ color: form.watch("primaryColor") }}
                  >
                    {form.watch("displayName")}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateConfig.isPending || !form.formState.isDirty}
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

export const Route = createFileRoute("/admin/branding-config")({
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      orpc.admin.getConfig.queryOptions()
    );
  },
  component: RouteComponent,
});