import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit,
  Crown,
  Users,
  FileText,
  BarChart3,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";

interface AdminRole {
  id: string;
  userId: string;
  role: string;
  permissions: string[];
  grantedBy: string;
  grantedAt: string;
  isActive: boolean;
  expiresAt?: string;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: AdminRole[];
}

const ROLE_TYPES = {
  'super_admin': {
    name: '슈퍼 관리자',
    icon: Crown,
    color: 'destructive',
    description: '모든 시스템 권한'
  },
  'content_admin': {
    name: '콘텐츠 관리자',
    icon: FileText,
    color: 'default',
    description: '콘텐츠 및 챌린지 관리'
  },
  'user_admin': {
    name: '사용자 관리자',
    icon: Users,
    color: 'secondary',
    description: '사용자 및 교회 관리'
  },
  'stats_viewer': {
    name: '통계 조회자',
    icon: BarChart3,
    color: 'outline',
    description: '통계 조회만 가능'
  },
};

export default function AdminRoles() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canManageRoles } = useAdminPermissions();
  const [, navigate] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin access check
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !canManageRoles)) {
      navigate("/");
    }
  }, [isAuthenticated, canManageRoles, authLoading, navigate]);

  const { data: adminUsers, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/roles'],
    enabled: isAuthenticated && canManageRoles,
  });

  const addRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      return apiRequest('POST', '/api/admin/roles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setIsAddDialogOpen(false);
      setSelectedUser("");
      setSelectedRole("");
      toast({
        title: "성공",
        description: "관리자 권한이 추가되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "권한 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest('DELETE', `/api/admin/roles/${userId}/${role}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      toast({
        title: "성공",
        description: "관리자 권한이 제거되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "권한 제거에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !canManageRoles) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            관리자 권한 데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleAddRole = () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "오류",
        description: "사용자와 권한을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    addRoleMutation.mutate({
      userId: selectedUser,
      role: selectedRole,
    });
  };

  const handleRemoveRole = (userId: string, role: string) => {
    if (window.confirm(`정말로 이 사용자의 "${ROLE_TYPES[role as keyof typeof ROLE_TYPES]?.name || role}" 권한을 제거하시겠습니까?`)) {
      removeRoleMutation.mutate({ userId, role });
    }
  };

  const getRoleIcon = (role: string) => {
    const roleInfo = ROLE_TYPES[role as keyof typeof ROLE_TYPES];
    const Icon = roleInfo?.icon || Settings;
    return <Icon className="h-4 w-4" />;
  };

  const getRoleBadgeVariant = (role: string) => {
    const roleInfo = ROLE_TYPES[role as keyof typeof ROLE_TYPES];
    return roleInfo?.color || 'outline';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" data-testid="admin-roles">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="title-admin-roles">
          관리자 권한 관리
        </h1>
        <p className="text-muted-foreground">
          시스템 관리자들의 권한을 관리하고 모니터링하세요.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {Object.entries(ROLE_TYPES).map(([role, info]) => {
          const count = adminUsers?.filter(user => 
            user.roles.some(r => r.role === role && r.isActive)
          ).length || 0;
          
          const Icon = info.icon;
          
          return (
            <Card key={role} data-testid={`card-${role}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{info.name}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`stat-${role}`}>
                  {count}명
                </div>
                <p className="text-xs text-muted-foreground">
                  {info.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Role Button */}
      <div className="mb-6">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-role">
              <Plus className="h-4 w-4 mr-2" />
              관리자 권한 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>관리자 권한 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-select">사용자 선택</Label>
                <Input
                  id="user-select"
                  placeholder="사용자 이메일 또는 ID 입력"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  data-testid="input-select-user"
                />
              </div>
              <div>
                <Label htmlFor="role-select">권한 선택</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="권한을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_TYPES).map(([role, info]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role)}
                          <div>
                            <div>{info.name}</div>
                            <div className="text-sm text-muted-foreground">{info.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  취소
                </Button>
                <Button 
                  onClick={handleAddRole}
                  disabled={addRoleMutation.isPending}
                  data-testid="button-confirm-add-role"
                >
                  {addRoleMutation.isPending ? "추가 중..." : "추가"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admin Users Table */}
      <Card data-testid="table-admin-roles">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            관리자 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>관리자</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>권한 부여일</TableHead>
                  <TableHead>권한 부여자</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers?.map((adminUser) => (
                  <TableRow key={adminUser.id} data-testid={`admin-row-${adminUser.id}`}>
                    <TableCell>
                      <div className="font-medium">
                        {adminUser.firstName} {adminUser.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {adminUser.id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>{adminUser.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {adminUser.roles.filter(role => role.isActive).map((role) => (
                          <Badge 
                            key={role.id} 
                            variant={getRoleBadgeVariant(role.role) as any}
                            className="flex items-center gap-1"
                          >
                            {getRoleIcon(role.role)}
                            {ROLE_TYPES[role.role as keyof typeof ROLE_TYPES]?.name || role.role}
                          </Badge>
                        ))}
                        {adminUser.roles.filter(role => role.isActive).length === 0 && (
                          <span className="text-muted-foreground text-sm">권한 없음</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {adminUser.roles.length > 0 && (
                          new Date(adminUser.roles[0].grantedAt).toLocaleDateString('ko-KR')
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {adminUser.roles.length > 0 && adminUser.roles[0].grantedBy}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {adminUser.roles.filter(role => role.isActive).map((role) => (
                          <Button 
                            key={role.id}
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemoveRole(adminUser.id, role.role)}
                            disabled={removeRoleMutation.isPending}
                            data-testid={`button-remove-${role.role}-${adminUser.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {adminUsers && adminUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 관리자가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card className="mt-6" data-testid="info-role-permissions">
        <CardHeader>
          <CardTitle>권한 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(ROLE_TYPES).map(([role, info]) => {
              const Icon = info.icon;
              
              return (
                <div key={role} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5" />
                    <h3 className="font-semibold">{info.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {info.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {role === 'super_admin' && "모든 시스템 권한, 관리자 계정 관리"}
                    {role === 'content_admin' && "콘텐츠 조회/편집/생성/삭제, 챌린지 관리, 통계 조회"}
                    {role === 'user_admin' && "사용자 조회/편집/정지, 교회 관리, 통계 조회"}
                    {role === 'stats_viewer' && "통계 조회 및 내보내기만 가능"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}