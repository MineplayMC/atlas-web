import { forwardRef, useImperativeHandle, useState } from "react";

import { Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerUnzipFileMutation } from "@/hooks/mutations/use-server-unzip-file-mutation";
import { useTemplateUnzipFileMutation } from "@/hooks/mutations/use-template-unzip-file-mutation";
import { FileItem } from "@/server/lib/atlas-api/atlas-api.schemas";

export interface FileUnzipDialogRef {
  openDialog: (_file: FileItem, _currentPath: string) => void;
}

interface FileUnzipDialogProps {
  serverId?: string;
  isTemplate?: boolean;
}

export const FileUnzipDialog = forwardRef<
  FileUnzipDialogRef,
  FileUnzipDialogProps
>(({ serverId, isTemplate = false }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [destination, setDestination] = useState("");

  const serverUnzipMutation = useServerUnzipFileMutation();
  const templateUnzipMutation = useTemplateUnzipFileMutation();

  const unzipMutation = isTemplate
    ? templateUnzipMutation
    : serverUnzipMutation;

  useImperativeHandle(ref, () => ({
    openDialog: (zipFile: FileItem, path: string) => {
      setFile(zipFile);
      setCurrentPath(path);

      setDestination("");
      setIsOpen(true);
    },
  }));

  const handleUnzip = () => {
    if (!file) {
      return;
    }

    const zipPath =
      currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
    const finalDestination = destination.trim() || ".";
    const unzipData = {
      zipPath,
      destination: finalDestination,
      workingPath: currentPath,
    };

    if (isTemplate) {
      templateUnzipMutation.mutate(unzipData, {
        onSuccess: () => {
          setIsOpen(false);
        },
      });
    } else if (serverId) {
      serverUnzipMutation.mutate(
        { server: serverId, ...unzipData },
        {
          onSuccess: () => {
            setIsOpen(false);
          },
        }
      );
    }
  };

  const isValid = true;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Extract Zip Archive
          </DialogTitle>
          <DialogDescription>
            Extract "{file?.name}" to a destination folder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Path</Label>
            <Input
              id="destination"
              placeholder="(current directory)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={unzipMutation.isPending}
            />
            <p className="text-muted-foreground text-xs">
              Leave empty to extract to current directory
            </p>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <div className="text-sm">
              <div className="font-medium">Archive: {file?.name}</div>
              <div className="text-muted-foreground">
                Size:{" "}
                {file?.size
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : "Unknown"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={unzipMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUnzip}
            disabled={!isValid || unzipMutation.isPending}
          >
            {unzipMutation.isPending ? "Extracting..." : "Extract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

FileUnzipDialog.displayName = "FileUnzipDialog";
