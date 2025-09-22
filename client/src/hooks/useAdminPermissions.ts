import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface AdminPermissions {
  userId: string;
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
}

export function useAdminPermissions() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery<AdminPermissions>({
    queryKey: ['/api/admin/me'],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const hasPermission = (permission: string) => {
    return data?.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string) => {
    return data?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]) => {
    return roles.some(role => hasRole(role));
  };

  const hasAnyPermission = (permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Permission groups for easier checking
  const canViewStats = hasAnyPermission(['stats.view']);
  const canViewUsers = hasAnyPermission(['users.view']);
  const canManageUsers = hasAnyPermission(['users.edit', 'users.ban', 'users.delete']);
  const canManageRoles = hasAnyPermission(['roles.manage']);
  const canViewLogs = hasAnyPermission(['logs.view']);
  const canManageSettings = hasAnyPermission(['settings.manage']);
  const canManage2FA = hasAnyPermission(['2fa.manage']);

  return {
    adminData: data,
    isLoading,
    error,
    isAdmin: data?.isAdmin || false,
    roles: data?.roles || [],
    permissions: data?.permissions || [],
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAnyPermission,
    // Convenient permission checks
    canViewStats,
    canViewUsers,
    canManageUsers,
    canManageRoles,
    canViewLogs,
    canManageSettings,
    canManage2FA,
  };
}