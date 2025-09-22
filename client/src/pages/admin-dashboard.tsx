import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Users, 
  Building2, 
  Activity, 
  TrendingUp, 
  Target, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Calendar
} from "lucide-react";
import { useLocation } from "wouter";

interface AdminStats {
  totalUsers: number;
  totalChurches: number;
  totalTypingSessions: number;
  averageWpm: number;
  averageAccuracy: number;
  newUsersThisWeek: number;
  activeUsersToday: number;
  usersByAge: Array<{ ageRange: string; count: number }>;
  usersByRegion: Array<{ region: string; count: number }>;
  churchMemberStats: Array<{ churchName: string; memberCount: number; averageWpm: number }>;
  recentActivity: Array<{ date: string; sessions: number; newUsers: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canViewStats, isAdmin } = useAdminPermissions();
  const [, navigate] = useLocation();

  // Admin access check
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !canViewStats)) {
      navigate("/");
    }
  }, [isAuthenticated, canViewStats, authLoading, navigate]);

  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: isAuthenticated && canViewStats,
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

  if (!isAuthenticated || !canViewStats) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            관리자 통계를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="title-admin-dashboard">
          관리자 대시보드
        </h1>
        <p className="text-muted-foreground">
          홀리넷 성경필사 서비스의 주요 통계와 현황을 확인하세요.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-users">
                  {stats?.totalUsers.toLocaleString()}명
                </div>
                <p className="text-xs text-muted-foreground">
                  이번 주 신규: {stats?.newUsersThisWeek}명
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">오늘 활성 사용자</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-active-users">
                  {stats?.activeUsersToday}명
                </div>
                <p className="text-xs text-muted-foreground">
                  오늘 활동한 사용자
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-churches">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">등록된 교회</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-churches">
                  {stats?.totalChurches}개
                </div>
                <p className="text-xs text-muted-foreground">
                  활성화된 교회 커뮤니티
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-typing-sessions">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 연습 세션</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-typing-sessions">
                  {stats?.totalTypingSessions.toLocaleString()}회
                </div>
                <p className="text-xs text-muted-foreground">
                  누적 필사 연습 횟수
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-average-wpm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평균 타자 속도</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="stat-average-wpm">
                  {stats?.averageWpm}WPM
                </div>
                <p className="text-xs text-muted-foreground">
                  전체 사용자 평균
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-average-accuracy">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평균 정확도</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-average-accuracy">
                  {stats?.averageAccuracy}%
                </div>
                <p className="text-xs text-muted-foreground">
                  전체 사용자 평균
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-new-users-week">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">이번 주 신규</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600" data-testid="stat-new-users-week">
                  {stats?.newUsersThisWeek}명
                </div>
                <p className="text-xs text-muted-foreground">
                  지난 7일간 가입
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-status">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">서비스 상태</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-service-status">
                  정상
                </div>
                <p className="text-xs text-muted-foreground">
                  모든 시스템 작동 중
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Age Distribution Chart */}
            <Card data-testid="chart-age-distribution">
              <CardHeader>
                <CardTitle>연령대별 사용자 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats?.usersByAge}
                      dataKey="count"
                      nameKey="ageRange"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      label={({ ageRange, count, percent }) => 
                        `${ageRange}: ${count}명 (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {stats?.usersByAge?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Region Distribution Chart */}
            <Card data-testid="chart-region-distribution">
              <CardHeader>
                <CardTitle>지역별 사용자 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.usersByRegion?.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="region" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Church Stats and Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Church Member Stats */}
            <Card data-testid="chart-church-stats">
              <CardHeader>
                <CardTitle>교회별 사용자 현황 (상위 10개)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.churchMemberStats?.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="churchName" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'memberCount' ? `${value}명` : `${value}WPM`,
                        name === 'memberCount' ? '회원 수' : '평균 WPM'
                      ]}
                    />
                    <Bar dataKey="memberCount" fill="#00C49F" name="memberCount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity Chart */}
            <Card data-testid="chart-recent-activity">
              <CardHeader>
                <CardTitle>최근 7일 활동 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats?.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
                      }}
                      formatter={(value, name) => [
                        `${value}${name === 'sessions' ? '회' : '명'}`,
                        name === 'sessions' ? '연습 세션' : '신규 가입자'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sessions" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="sessions"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="newUsers" 
                      stackId="2"
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="newUsers"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <Card data-testid="info-admin-tools">
            <CardHeader>
              <CardTitle>관리자 도구</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                현재 대시보드는 실시간 통계 정보를 제공합니다. 
                사용자 관리, 교회 관리, 시스템 모니터링 등의 추가 기능은 향후 추가될 예정입니다.
              </p>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>마지막 업데이트: {new Date().toLocaleString('ko-KR')}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}