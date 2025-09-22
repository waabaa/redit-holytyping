import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Search, 
  Filter,
  Eye,
  Calendar,
  Clock,
  User,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { useLocation } from "wouter";

interface AdminAccessLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  method: string;
  url: string;
  userAgent: string;
  ipAddress: string;
  success: boolean;
  errorMessage?: string;
  requestData?: any;
  responseStatus: number;
  duration: number;
  createdAt: string;
}

interface ActionStat {
  action: string;
  count: number;
  successRate: number;
}

export default function AdminLogs() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canViewLogs } = useAdminPermissions();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterSuccess, setFilterSuccess] = useState("");
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Admin access check
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !canViewLogs)) {
      navigate("/");
    }
  }, [isAuthenticated, canViewLogs, authLoading, navigate]);

  const { data: logsData, isLoading: logsLoading, error } = useQuery<{
    logs: AdminAccessLog[];
    total: number;
  }>({
    queryKey: ['/api/admin/logs', { 
      userId: filterUser || undefined, 
      limit, 
      offset: page * limit 
    }],
    enabled: isAuthenticated && canViewLogs,
  });

  const { data: actionStats, isLoading: statsLoading } = useQuery<ActionStat[]>({
    queryKey: ['/api/admin/stats/actions', { timeRange }],
    enabled: isAuthenticated && canViewLogs,
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

  if (!isAuthenticated || !canViewLogs) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            접근 로그 데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredLogs = logsData?.logs?.filter(log => {
    if (search && !log.action.toLowerCase().includes(search.toLowerCase()) &&
        !log.url.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterAction && log.action !== filterAction) {
      return false;
    }
    if (filterSuccess === 'success' && !log.success) {
      return false;
    }
    if (filterSuccess === 'error' && log.success) {
      return false;
    }
    return true;
  }) || [];

  const getStatusBadge = (success: boolean, status: number) => {
    if (success && status < 400) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          성공
        </Badge>
      );
    } else if (status >= 400 && status < 500) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          클라이언트 오류
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          서버 오류
        </Badge>
      );
    }
  };

  const getMethodBadge = (method: string) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <Badge variant="outline" className={colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {method}
      </Badge>
    );
  };

  const uniqueActions = Array.from(new Set(logsData?.logs?.map(log => log.action) || []));

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" data-testid="admin-logs">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="title-admin-logs">
          관리자 접근 로그
        </h1>
        <p className="text-muted-foreground">
          시스템 관리자들의 모든 접근 및 작업 기록을 모니터링하세요.
        </p>
      </div>

      {/* Action Statistics */}
      <Card className="mb-6" data-testid="card-action-stats">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              작업 통계
            </CardTitle>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">오늘</SelectItem>
                <SelectItem value="weekly">이번 주</SelectItem>
                <SelectItem value="monthly">이번 달</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {actionStats?.slice(0, 8).map((stat) => (
                <div key={stat.action} className="border rounded-lg p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.action.replace(/_/g, ' ')}
                  </div>
                  <div className="text-2xl font-bold mb-1">{stat.count}</div>
                  <div className="text-xs text-muted-foreground">
                    성공률: {stat.successRate.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="search">검색</Label>
              <Input
                id="search"
                placeholder="작업 또는 URL 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <div>
              <Label htmlFor="filter-user">사용자 ID</Label>
              <Input
                id="filter-user"
                placeholder="사용자 ID로 필터링..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                data-testid="input-filter-user"
              />
            </div>
            <div>
              <Label htmlFor="filter-action">작업</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger data-testid="select-filter-action">
                  <SelectValue placeholder="작업 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">모든 작업</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-success">상태</Label>
              <Select value={filterSuccess} onValueChange={setFilterSuccess}>
                <SelectTrigger data-testid="select-filter-success">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">모든 상태</SelectItem>
                  <SelectItem value="success">성공</SelectItem>
                  <SelectItem value="error">오류</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch("");
                  setFilterUser("");
                  setFilterAction("");
                  setFilterSuccess("");
                }}
                data-testid="button-clear-filters"
              >
                필터 초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Logs Table */}
      <Card data-testid="table-access-logs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            접근 로그 ({filteredLogs.length}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>메소드</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>응답시간</TableHead>
                  <TableHead>IP 주소</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(log.createdAt).toLocaleDateString('ko-KR')}</div>
                        <div className="text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString('ko-KR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.userId.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {log.action.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.resource}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getMethodBadge(log.method)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono max-w-xs truncate">
                        {log.url}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(log.success, log.responseStatus)}
                        <div className="text-xs text-muted-foreground">
                          {log.responseStatus}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.duration}ms
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">
                        {log.ipAddress}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredLogs.length === 0 && !logsLoading && (
            <div className="text-center py-8 text-muted-foreground">
              조건에 맞는 로그가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {logsData && logsData.total > limit && (
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
              {page + 1} / {Math.ceil(logsData.total / limit)}
            </span>
            <Button 
              variant="outline" 
              disabled={(page + 1) * limit >= logsData.total}
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