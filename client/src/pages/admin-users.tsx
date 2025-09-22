import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Search, 
  UserPlus, 
  Ban, 
  UnlockKeyhole,
  Mail,
  Calendar,
  Settings,
  Shield
} from "lucide-react";
import { useLocation } from "wouter";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  emailVerified: boolean;
  profileCompleted: boolean;
  totalWords: number;
  averageWpm: number;
  totalPoints: number;
  createdAt: string;
  churchId?: string;
}

interface AdminUser extends User {
  roles: Array<{
    id: string;
    role: string;
    permissions: string[];
    isActive: boolean;
  }>;
}

export default function AdminUsers() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canManageUsers, isAdmin } = useAdminPermissions();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [limit] = useState(20);

  // Admin access check
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !canManageUsers)) {
      navigate("/");
    }
  }, [isAuthenticated, canManageUsers, authLoading, navigate]);

  const { data: usersData, isLoading, error } = useQuery<{
    users: User[];
    total: number;
  }>({
    queryKey: ['/api/admin/users', { search, page, limit }],
    enabled: isAuthenticated && canManageUsers,
  });

  const { data: adminUsers } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/roles'],
    enabled: isAuthenticated && canManageUsers,
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

  if (!isAuthenticated || !canManageUsers) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            사용자 데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isUserAdmin = (userId: string) => {
    return adminUsers?.some(admin => admin.id === userId);
  };

  const getUserRoles = (userId: string) => {
    const adminUser = adminUsers?.find(admin => admin.id === userId);
    return adminUser?.roles || [];
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" data-testid="admin-users">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="title-admin-users">
          사용자 관리
        </h1>
        <p className="text-muted-foreground">
          홀리넷 성경필사 서비스의 사용자들을 관리하고 모니터링하세요.
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            사용자 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="이메일, 이름으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-user-search"
              />
            </div>
            <Button variant="outline" data-testid="button-advanced-search">
              <Settings className="h-4 w-4 mr-2" />
              고급 검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">
              {usersData?.total || 0}명
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-verified-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">인증된 사용자</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-verified-users">
              {usersData?.users?.filter(u => u.emailVerified).length || 0}명
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-admin-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">관리자</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-admin-users">
              {adminUsers?.length || 0}명
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-complete-profiles">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">프로필 완성</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-complete-profiles">
              {usersData?.users?.filter(u => u.profileCompleted).length || 0}명
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card data-testid="table-users">
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
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
                  <TableHead>사용자</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>통계</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.users?.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {user.id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{user.email}</span>
                        {user.emailVerified && (
                          <Badge variant="secondary" className="text-xs">
                            인증됨
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={user.profileCompleted ? "default" : "outline"}
                          className="w-fit"
                        >
                          {user.profileCompleted ? "프로필 완성" : "프로필 미완성"}
                        </Badge>
                        {isUserAdmin(user.id) && (
                          <Badge variant="destructive" className="w-fit">
                            <Shield className="h-3 w-3 mr-1" />
                            관리자
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getUserRoles(user.id).map((role) => (
                          <Badge key={role.id} variant="outline" className="w-fit text-xs">
                            {role.role}
                          </Badge>
                        ))}
                        {getUserRoles(user.id).length === 0 && (
                          <span className="text-muted-foreground text-sm">일반 사용자</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{user.averageWpm}WPM</div>
                        <div className="text-muted-foreground">
                          {user.totalPoints}점
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-edit-${user.id}`}
                        >
                          편집
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-ban-${user.id}`}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {usersData && usersData.total > limit && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              data-testid="button-prev-page"
            >
              이전
            </Button>
            <span className="flex items-center px-4">
              {page + 1} / {Math.ceil(usersData.total / limit)}
            </span>
            <Button 
              variant="outline" 
              disabled={(page + 1) * limit >= usersData.total}
              onClick={() => setPage(page + 1)}
              data-testid="button-next-page"
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}