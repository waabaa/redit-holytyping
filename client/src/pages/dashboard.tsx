import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, 
  Target, 
  Award, 
  Calendar, 
  Trophy, 
  Users, 
  BookOpen,
  Clock,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Play,
  Flame,
  Star
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import StatsDisplay from "@/components/stats-display";
import { 
  StatCard, 
  RankingStatCard, 
  GoalStatCard, 
  AchievementCard 
} from "@/components/stat-card";
import {
  WeeklyProgressChart,
  BibleProgressChart,
  SessionTrendChart,
  PracticeTimeChart,
  MonthlyProgressChart
} from "@/components/dashboard-charts";
import { 
  DashboardSkeleton, 
  StatCardSkeleton, 
  ChartSkeleton,
  SessionItemSkeleton,
  AchievementSkeleton 
} from "@/components/skeleton-loader";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  // Transform real data for charts
  const getWeeklyProgressData = () => {
    if (!dashboardData?.weeklyProgress || dashboardData.weeklyProgress.length === 0) {
      return [];
    }
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return dashboardData.weeklyProgress.map(item => {
      const date = new Date(item.date);
      const dayName = dayNames[date.getDay()];
      return {
        day: dayName,
        sessions: item.sessions,
        wpm: item.avgWpm,
        accuracy: 95, // Placeholder - accuracy not in weekly progress API
        wordsTyped: item.wordsTyped
      };
    });
  };

  const getBibleProgressData = () => {
    if (!progressData?.bibleProgress || progressData.bibleProgress.length === 0) {
      return [];
    }
    
    return progressData.bibleProgress.slice(0, 5).map(book => ({
      book: book.bookName,
      progress: book.progressPercentage,
      totalVerses: book.totalChapters * 30, // Estimate 30 verses per chapter
      completedVerses: Math.round((book.progressPercentage / 100) * book.totalChapters * 30)
    }));
  };

  const getSessionTrendData = () => {
    if (!recentSessions || recentSessions.length === 0) {
      return [];
    }
    
    return recentSessions.slice(0, 7).map(session => {
      const date = new Date(session.createdAt);
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        wpm: session.wpm,
        accuracy: session.accuracy,
        duration: Math.round(session.duration / 60), // Convert to minutes
        points: Math.round(session.wpm * session.accuracy * 0.1) // Calculate estimated points
      };
    }).reverse(); // Show chronologically
  };

  const getPracticeTimeData = () => {
    // This would need additional API data - for now return empty or fallback
    if (!recentSessions || recentSessions.length === 0) {
      return [];
    }
    
    // Group sessions by time of day as a fallback
    const timeGroups = {
      오전: { hours: 0, sessions: 0 },
      오후: { hours: 0, sessions: 0 },
      저녁: { hours: 0, sessions: 0 },
      밤: { hours: 0, sessions: 0 }
    };
    
    recentSessions.forEach(session => {
      const hour = new Date(session.createdAt).getHours();
      const duration = session.duration / 3600; // Convert to hours
      
      if (hour >= 6 && hour < 12) {
        timeGroups.오전.hours += duration;
        timeGroups.오전.sessions += 1;
      } else if (hour >= 12 && hour < 18) {
        timeGroups.오후.hours += duration;
        timeGroups.오후.sessions += 1;
      } else if (hour >= 18 && hour < 24) {
        timeGroups.저녁.hours += duration;
        timeGroups.저녁.sessions += 1;
      } else {
        timeGroups.밤.hours += duration;
        timeGroups.밤.sessions += 1;
      }
    });
    
    return Object.entries(timeGroups).map(([period, data]) => ({
      period,
      hours: Math.round(data.hours * 10) / 10, // Round to 1 decimal
      sessions: data.sessions
    })).filter(item => item.sessions > 0); // Only include periods with sessions
  };

  // Dashboard 종합 정보
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    error: dashboardError,
    isError: isDashboardError 
  } = useQuery<{
    user: any;
    stats: {
      totalWords: number;
      averageWpm: number;
      averageAccuracy: number;
      totalSessions: number;
      practiceStreak: number;
      totalPoints: number;
    };
    rankings: {
      globalRank: number;
      churchRank: number | null;
      totalUsers: number;
      percentile: number;
    };
    recentSessions: any[];
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      unlockedAt: Date | null;
      progress: number;
      total: number;
    }>;
    weeklyProgress: Array<{
      date: string;
      sessions: number;
      wordsTyped: number;
      avgWpm: number;
    }>;
  }>({
    queryKey: ["/api/user/dashboard"],
    enabled: isAuthenticated,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 최근 세션 기록
  const { 
    data: recentSessions, 
    isLoading: sessionsLoading, 
    error: sessionsError,
    isError: isSessionsError 
  } = useQuery<Array<{
    id: string;
    wpm: number;
    accuracy: number;
    wordsTyped: number;
    duration: number;
    createdAt: string;
    bookName: string;
    chapter: number;
    verse: number;
  }>>({
    queryKey: ["/api/user/recent-sessions"],
    enabled: isAuthenticated,
    retry: 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // 진행률 정보
  const { 
    data: progressData, 
    isLoading: progressLoading, 
    error: progressError,
    isError: isProgressError 
  } = useQuery<{
    bibleProgress: Array<{
      bookId: string;
      bookName: string;
      chaptersCompleted: number;
      totalChapters: number;
      progressPercentage: number;
    }>;
    dailyGoal: {
      targetSessions: number;
      targetWords: number;
      currentSessions: number;
      currentWords: number;
    };
    weeklyGoal: {
      targetSessions: number;
      targetWords: number;
      currentSessions: number;
      currentWords: number;
    };
  }>({
    queryKey: ["/api/user/progress"],
    enabled: isAuthenticated,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 업적 정보
  const { 
    data: achievements, 
    isLoading: achievementsLoading, 
    error: achievementsError,
    isError: isAchievementsError 
  } = useQuery<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'typing' | 'speed' | 'accuracy' | 'streak' | 'bible';
    unlockedAt: Date | null;
    progress: number;
    total: number;
    isUnlocked: boolean;
  }>>({
    queryKey: ["/api/user/achievements"],
    enabled: isAuthenticated,
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>로그인이 필요합니다</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              대시보드를 이용하려면 로그인해주세요.
            </p>
            <a href="/api/login">
              <Button size="lg" data-testid="button-login-required">로그인</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 주요 데이터 로딩 중일 때 스켈레톤 표시
  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  // 주요 데이터 에러 처리
  if (isDashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">데이터 로드 실패</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              대시보드 데이터를 불러오는 데 실패했습니다.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              data-testid="button-retry-dashboard"
            >
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const rankings = dashboardData?.rankings;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-welcome">
            안녕하세요, {user?.firstName || user?.email}님! 👋
          </h1>
          <p className="text-muted-foreground">
            오늘도 성경 필사로 하나님의 말씀과 함께하세요.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <Link href="/practice">
              <Button size="lg" className="flex items-center space-x-2" data-testid="button-quick-practice">
                <Play className="h-5 w-5" />
                <span>연습 시작하기</span>
              </Button>
            </Link>
            <Link href="/challenges">
              <Button variant="outline" size="lg" className="flex items-center space-x-2" data-testid="button-challenges">
                <Trophy className="h-5 w-5" />
                <span>챌린지 참여</span>
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" size="lg" className="flex items-center space-x-2" data-testid="button-leaderboard">
                <BarChart3 className="h-5 w-5" />
                <span>순위 보기</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Main Stats & Goals */}
          <div className="xl:col-span-2 space-y-6">
            {/* Personal Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="평균 속도"
                value={`${Math.round(stats?.averageWpm || 0)} WPM`}
                icon={TrendingUp}
                iconColor="text-blue-500"
                subtitle="전체 평균보다 +15% 빠름"
                trend={{ value: "+15%", isPositive: true }}
                testId="stat-average-wpm"
              />

              <StatCard
                title="정확도"
                value={`${Math.round(stats?.averageAccuracy || 0)}%`}
                icon={Target}
                iconColor="text-green-500"
                subtitle="지난주보다 +2% 향상"
                trend={{ value: "+2%", isPositive: true }}
                testId="stat-accuracy"
              />

              <StatCard
                title="연속 연습"
                value={`${stats?.practiceStreak || 0}일`}
                icon={Flame}
                iconColor="text-orange-500"
                subtitle="지금까지 최고 기록!"
                testId="stat-practice-streak"
              />

              <StatCard
                title="총 세션"
                value={`${stats?.totalSessions || 0}회`}
                icon={Clock}
                iconColor="text-purple-500"
                subtitle="지난달 대비 +25%"
                trend={{ value: "+25%", isPositive: true }}
                testId="stat-total-sessions"
              />

              <StatCard
                title="총 포인트"
                value={stats?.totalPoints?.toLocaleString() || 0}
                icon={Star}
                iconColor="text-yellow-500"
                subtitle="다음 레벨까지 500점"
                testId="stat-total-points"
              />

              <RankingStatCard
                title="전체 순위"
                rank={rankings?.globalRank || 0}
                total={rankings?.totalUsers}
                percentile={rankings?.percentile}
                icon={Trophy}
                iconColor="text-amber-500"
                testId="stat-global-rank"
              />
            </div>

            {/* Daily & Weekly Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoalStatCard
                title="오늘의 목표"
                icon={Calendar}
                iconColor="text-green-500"
                goals={[
                  {
                    label: "연습 세션",
                    current: progressData?.dailyGoal.currentSessions || 0,
                    target: progressData?.dailyGoal.targetSessions || 3,
                    unit: "회"
                  },
                  {
                    label: "타자 수",
                    current: progressData?.dailyGoal.currentWords || 0,
                    target: progressData?.dailyGoal.targetWords || 500,
                    unit: "단어"
                  }
                ]}
                testId="daily-goals"
              />

              <GoalStatCard
                title="이번 주 목표"
                icon={BarChart3}
                iconColor="text-blue-500"
                goals={[
                  {
                    label: "연습 세션",
                    current: progressData?.weeklyGoal.currentSessions || 0,
                    target: progressData?.weeklyGoal.targetSessions || 20,
                    unit: "회"
                  },
                  {
                    label: "타자 수",
                    current: progressData?.weeklyGoal.currentWords || 0,
                    target: progressData?.weeklyGoal.targetWords || 3500,
                    unit: "단어"
                  }
                ]}
                testId="weekly-goals"
              />
            </div>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span>최근 연습 기록</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <SessionItemSkeleton key={i} />
                    ))}
                  </div>
                ) : isSessionsError ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">최근 세션 데이터를 불러올 수 없습니다.</p>
                    <Button size="sm" onClick={() => window.location.reload()} data-testid="button-retry-sessions">
                      다시 시도
                    </Button>
                  </div>
                ) : recentSessions && recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        data-testid={`session-${session.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {session.bookName} {session.chapter}:{session.verse}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="text-center">
                            <p className="font-medium">{session.wpm} WPM</p>
                            <p className="text-xs text-muted-foreground">속도</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{session.accuracy}%</p>
                            <p className="text-xs text-muted-foreground">정확도</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">아직 연습 기록이 없습니다.</p>
                    <Link href="/practice">
                      <Button className="mt-4" data-testid="button-start-practice">
                        첫 연습 시작하기
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="space-y-6">
              {/* Weekly Progress and Session Trend */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {dashboardLoading ? (
                  <ChartSkeleton />
                ) : isDashboardError ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">주간 데이터를 불러올 수 없습니다.</p>
                    </CardContent>
                  </Card>
                ) : getWeeklyProgressData().length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <span>주간 연습 현황</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">이번 주 연습 기록이 없습니다.</p>
                      <Link href="/practice">
                        <Button size="sm" data-testid="button-start-weekly-practice">
                          연습 시작하기
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <WeeklyProgressChart data={getWeeklyProgressData()} />
                )}
                
                {sessionsLoading ? (
                  <ChartSkeleton />
                ) : isSessionsError ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">세션 데이터를 불러올 수 없습니다.</p>
                    </CardContent>
                  </Card>
                ) : getSessionTrendData().length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                        <span>최근 성과 추세</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">최근 연습 기록이 없습니다.</p>
                      <Link href="/practice">
                        <Button size="sm" data-testid="button-start-trend-practice">
                          연습 시작하기
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <SessionTrendChart data={getSessionTrendData()} />
                )}
              </div>

              {/* Bible Progress and Practice Time */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {progressLoading ? (
                  <ChartSkeleton />
                ) : isProgressError ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">성경 진행률 데이터를 불러올 수 없습니다.</p>
                    </CardContent>
                  </Card>
                ) : getBibleProgressData().length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BookOpen className="h-5 w-5 text-green-500" />
                        <span>성경 책별 진행률</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">아직 성경 필사 기록이 없습니다.</p>
                      <Link href="/practice">
                        <Button size="sm" data-testid="button-start-bible-chart">
                          성경 필사 시작하기
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <BibleProgressChart data={getBibleProgressData()} />
                )}
                
                {/* Practice Time Chart - always show something */}
                <PracticeTimeChart data={getPracticeTimeData()} />
              </div>
            </div>
          </div>

          {/* Right Column - Achievements & Progress */}
          <div className="space-y-6">
            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <span>업적</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {achievementsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <AchievementSkeleton key={i} />
                    ))}
                  </div>
                ) : isAchievementsError ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">업적 데이터를 불러올 수 없습니다.</p>
                    <Button size="sm" onClick={() => window.location.reload()} data-testid="button-retry-achievements">
                      다시 시도
                    </Button>
                  </div>
                ) : achievements && achievements.length > 0 ? (
                  <div className="space-y-3">
                    {achievements.slice(0, 6).map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        testId={`achievement-${achievement.id}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">아직 달성한 업적이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bible Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-purple-500" />
                  <span>성경 진행률</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progressLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : progressData && progressData.bibleProgress.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {progressData.bibleProgress.slice(0, 10).map((book) => (
                      <div key={book.bookId} className="space-y-2" data-testid={`book-progress-${book.bookId}`}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{book.bookName}</span>
                          <span className="text-muted-foreground">
                            {book.chaptersCompleted}/{book.totalChapters}
                          </span>
                        </div>
                        <Progress value={book.progressPercentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">아직 연습한 성경이 없습니다.</p>
                    <Link href="/practice">
                      <Button className="mt-4" size="sm" data-testid="button-start-bible-practice">
                        성경 필사 시작하기
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Church Ranking */}
            {rankings?.churchRank && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <span>교회 내 순위</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600" data-testid="stat-church-rank">
                      #{rankings.churchRank}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      교회 내 순위
                    </p>
                    <Link href="/churches">
                      <Button variant="outline" size="sm" className="mt-4" data-testid="button-view-church">
                        교회 페이지 보기
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}