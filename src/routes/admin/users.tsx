import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Shield, Ban, Clock, Crown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc";

const RouteComponent = () => {
  const { data: usersData, isLoading } = useQuery(orpc.admin.listUsers.queryOptions());
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [banningUser, setBanningUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [banReason, setBanReason] = useState("");

  // Ensure users is always an array
  const users = Array.isArray(usersData) ? usersData : [];

  const updateRoleMutation = useMutation(
    orpc.admin.updateUserRole.mutationOptions({
      onSuccess: () => {
        toast.success("User role updated successfully");
        queryClient.invalidateQueries(orpc.admin.listUsers.queryOptions());
        setEditingUser(null);
      },
      onError: (error) => {
        toast.error(`Failed to update role: ${error.message}`);
      },
    })
  );

  const banUserMutation = useMutation(
    orpc.admin.banUser.mutationOptions({
      onSuccess: () => {
        toast.success("User banned successfully");
        queryClient.invalidateQueries(orpc.admin.listUsers.queryOptions());
        setBanningUser(null);
        setBanReason("");
      },
      onError: (error) => {
        toast.error(`Failed to ban user: ${error.message}`);
      },
    })
  );

  const unbanUserMutation = useMutation(
    orpc.admin.unbanUser.mutationOptions({
      onSuccess: () => {
        toast.success("User unbanned successfully");
        queryClient.invalidateQueries(orpc.admin.listUsers.queryOptions());
      },
      onError: (error) => {
        toast.error(`Failed to unban user: ${error.message}`);
      },
    })
  );

  const deleteUserMutation = useMutation(
    orpc.admin.deleteUser.mutationOptions({
      onSuccess: () => {
        toast.success("User deleted successfully");
        queryClient.invalidateQueries(orpc.admin.listUsers.queryOptions());
        setDeletingUser(null);
      },
      onError: (error) => {
        toast.error(`Failed to delete user: ${error.message}`);
      },
    })
  );

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleBanUser = (userId: string) => {
    banUserMutation.mutate({ userId, reason: banReason });
  };

  const handleUnbanUser = (userId: string) => {
    unbanUserMutation.mutate({ userId });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate({ userId });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "admin":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>User Management</CardTitle>
          </div>
          <CardDescription>
            Manage users, roles, and access permissions. Total users: {users?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                No users have been registered yet.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback>
                              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.name || "Unnamed User"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                          {user.role || "user"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              Banned
                            </Badge>
                            {user.banExpires && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Until {formatDate(user.banExpires)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User: {user.name || user.email}</DialogTitle>
                                <DialogDescription>
                                  Manage user role and permissions.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="role">Role</Label>
                                  <Select
                                    value={editingUser?.role || "user"}
                                    onValueChange={(value) =>
                                      setEditingUser({ ...editingUser, role: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4" />
                                          User
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="admin">
                                        <div className="flex items-center gap-2">
                                          <Crown className="h-4 w-4" />
                                          Admin
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => {
                                    if (editingUser) {
                                      handleRoleChange(editingUser.id, editingUser.role);
                                    }
                                  }}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  {updateRoleMutation.isPending ? "Updating..." : "Save Changes"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {user.role !== "admin" && (
                            user.banned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnbanUser(user.id)}
                                disabled={unbanUserMutation.isPending}
                              >
                                {unbanUserMutation.isPending ? "Unbanning..." : "Unban"}
                              </Button>
                            ) : (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setBanningUser(user)}
                                  >
                                    Ban
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Ban User: {user.name || user.email}</DialogTitle>
                                    <DialogDescription>
                                      This will prevent the user from accessing the application.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="banReason">Reason (optional)</Label>
                                      <Input
                                        id="banReason"
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                        placeholder="Enter reason for ban..."
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="destructive"
                                      onClick={() => {
                                        if (banningUser) {
                                          handleBanUser(banningUser.id);
                                        }
                                      }}
                                      disabled={banUserMutation.isPending}
                                    >
                                      {banUserMutation.isPending ? "Banning..." : "Ban User"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )
                          )}

                          {user.role !== "admin" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeletingUser(user)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete User: {user.name || user.email}</DialogTitle>
                                  <DialogDescription>
                                    <span className="text-destructive font-medium">
                                      This action cannot be undone.
                                    </span>{" "}
                                    This will permanently delete the user and all their data.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setDeletingUser(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      if (deletingUser) {
                                        handleDeleteUser(deletingUser.id);
                                      }
                                    }}
                                    disabled={deleteUserMutation.isPending}
                                  >
                                    {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/admin/users")({
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      orpc.admin.listUsers.queryOptions()
    );
  },
  component: RouteComponent,
});