import React, { useCallback, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { File, Folder, Upload } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { isFileEditableByNameAndType } from "@/lib/utils";
import { FileItem } from "@/server/lib/atlas-api/atlas-api.schemas";

import { FileActionsDropdown } from "./file-actions-dropdown";

const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const isEditable = (file: FileItem): boolean => {
  if (!file.file) return false;
  return isFileEditableByNameAndType(file.name, file.mimeType);
};

interface FileTableProps {
  files: FileItem[];
  isLoading: boolean;
  serverId?: string;
  currentPath: string;
  onNavigateToPath: (_path: string) => void;
  onEditFile: (_file: FileItem) => void;
  onRenameFile: (_file: FileItem) => void;
  onMoveFile: (_file: FileItem) => void;
  onDeleteFile: (_file: FileItem) => void;
  onUploadFiles: (_files: File[]) => void;
  onUnzipFile?: (_file: FileItem) => void;
  onZipFolder?: (_file: FileItem) => void;
  isTemplate?: boolean;
}

export const FileTable = React.memo(
  ({
    files,
    isLoading,
    serverId,
    currentPath,
    onNavigateToPath,
    onEditFile,
    onRenameFile,
    onMoveFile,
    onDeleteFile,
    onUploadFiles,
    onUnzipFile,
    onZipFolder,
    isTemplate = false,
  }: FileTableProps) => {
    const navigate = useNavigate();
    const [isDragOver, setIsDragOver] = useState(false);

    const handleRowClick = useCallback(
      (file: FileItem, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("input")) return;

        if (!file.file && !file.symlink) {
          if (file.name === "..") {
            const parentPath =
              currentPath.split("/").slice(0, -1).join("/") || "/";
            if (parentPath === "/") {
              navigate({ to: ".", search: {} });
            } else {
              onNavigateToPath(parentPath);
            }
          } else {
            onNavigateToPath(
              currentPath === "/"
                ? `/${file.name}`
                : `${currentPath}/${file.name}`
            );
          }
        } else if (isEditable(file)) {
          onEditFile(file);
        }
      },
      [currentPath, navigate, onNavigateToPath, onEditFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only hide overlay if leaving the container entirely
      const rect = e.currentTarget.getBoundingClientRect();
      const isOutside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;

      if (isOutside) {
        setIsDragOver(false);
      }
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
          onUploadFiles(droppedFiles);
        }
      },
      [onUploadFiles]
    );

    return (
      <div
        className={`relative overflow-hidden rounded-lg ${
          isDragOver ? "ring-primary ring-2 ring-offset-2" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="bg-background/90 border-primary absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed backdrop-blur-sm">
            <div className="text-center">
              <Upload className="text-primary mx-auto mb-2 h-12 w-12" />
              <p className="text-foreground text-lg font-medium">
                Drop files to upload
              </p>
              <p className="text-muted-foreground text-sm">
                Files will be uploaded to the current folder
              </p>
            </div>
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="text-muted-foreground border-b text-sm">
              <th className="p-3 text-left font-medium">Name</th>
              <th className="w-24 p-3 text-right font-medium">Size</th>
              <th className="w-32 p-3 text-right font-medium">Modified</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className={`${i < 7 ? "border-b" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Skeleton className="ml-auto h-4 w-12" />
                  </td>
                  <td className="p-3 text-right">
                    <Skeleton className="ml-auto h-4 w-16" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-8 w-8" />
                  </td>
                </tr>
              ))
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-muted-foreground h-12 w-12" />
                    <div>
                      <h3 className="text-lg font-medium">
                        This folder is empty
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        No files or folders to display
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              files.map((file, index) => (
                <tr
                  key={file.name}
                  className={`hover:bg-muted/30 cursor-pointer ${
                    index < files.length - 1 ? "border-b" : ""
                  }`}
                  onClick={(e) => handleRowClick(file, e)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {!file.file ? (
                        <Folder
                          className={`h-5 w-5 flex-shrink-0 ${
                            file.name === ".."
                              ? "text-muted-foreground"
                              : "text-blue-500"
                          }`}
                        />
                      ) : (
                        <File className="text-foreground h-5 w-5 flex-shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          file.name === ".." ? "text-muted-foreground" : ""
                        }`}
                      >
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted-foreground p-3 text-right text-sm">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="text-muted-foreground p-3 text-right text-sm">
                    {formatDate(file.modifiedAt)}
                  </td>
                  <td className="p-3">
                    {file.name !== ".." && (
                      <FileActionsDropdown
                        file={file}
                        serverId={serverId}
                        currentPath={currentPath}
                        onEdit={onEditFile}
                        onRename={onRenameFile}
                        onMove={onMoveFile}
                        onDelete={onDeleteFile}
                        onUnzip={onUnzipFile}
                        onZipFolder={onZipFolder}
                        isTemplate={isTemplate}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }
);

FileTable.displayName = "FileTable";
