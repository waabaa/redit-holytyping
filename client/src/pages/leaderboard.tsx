import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Users, Crown, Medal, Award, TrendingUp, ChevronLeft, ChevronRight, Star, Target, Clock, Globe } from "lucide-react";
import { useState } from "react";

export default function Leaderboard() {
  const { user, isAuthenticated } = useAuth();
  
  // State for filters
  const [globalSortBy, setGlobalSortBy] = useState<'totalPoints' | 'averageWpm' | 'totalAccuracy'>('totalPoints');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [churchSortBy, setChurchSortBy] = useState<'totalPoints' | 'averageWpm' | 'memberCount'>('totalPoints');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Queries
  const { data: globalLeaderboard, isLoading: globalLoading } = useQuery({
    queryKey: ["/api/leaderboard/global", globalSortBy, timeRange, currentPage],
    queryFn: ({ queryKey }) => {
      const [url, sortBy, range, page] = queryKey;
      const offset = ((page as number) - 1) * itemsPerPage;
      return fetch(`${url}?sortBy=${sortBy}&timeRange=${range}&limit=${itemsPerPage}&offset=${offset}`)
        .then(res => res.json());
    }
  });

  const { data: personalLeaderboard, isLoading: personalLoading } = useQuery({
    queryKey: ["/api/leaderboard/personal"],
  });

  const { data: churchLeaderboard, isLoading: churchLoading } = useQuery({
    queryKey: ["/api/leaderboard/churches", churchSortBy, currentPage],
    queryFn: ({ queryKey }) => {
      const [url, sortBy, page] = queryKey;
      const offset = ((page as number) - 1) * itemsPerPage;
      return fetch(`${url}?sortBy=${sortBy}&limit=${itemsPerPage}&offset=${offset}`)
        .then(res => res.json());
    }
  });

  const { data: userRankInfo } = useQuery({
    queryKey: ["/api/leaderboard/personal", (user as any)?.id],
    queryFn: () => fetch(`/api/leaderboard/personal/${(user as any)?.id}`).then(res => res.json()),
    enabled: !!(user as any)?.id,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 2:
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 3:
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getSortLabel = (sortBy: string) => {
    switch (sortBy) {
      case 'totalPoints':
        return '총 포인트';
      case 'averageWpm':
        return '평균 WPM';
      case 'totalAccuracy':
        return '정확도';
      case 'memberCount':
        return '멤버 수';
      default:
        return sortBy;
    }
  };

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'daily':
        return '오늘';
      case 'weekly':
        return '이번 주';
      case 'monthly':
        return '이번 달';
      case 'all':
        return '전체';
      default:
        return range;
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg animate-pulse">
          <div className="w-10 h-10 bg-muted rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
          <div className="space-y-2 text-right">
            <div className="h-4 bg-muted rounded w-16"></div>
            <div className="h-3 bg-muted rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const Pagination = ({ total, current, onChange }: { total: number; current: number; onChange: (page: number) => void }) => {
    const totalPages = Math.ceil(total / itemsPerPage);
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(current - 1)}
          disabled={current <= 1}
          data-testid="pagination-prev"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm text-muted-foreground">
          {current} / {totalPages} 페이지
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(current + 1)}
          disabled={current >= totalPages}
          data-testid="pagination-next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const UserRankCard = () => {
    if (!isAuthenticated || !userRankInfo) return null;

    return (
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={(user as any)?.profileImageUrl} />
                <AvatarFallback>
                  {((user as any)?.firstName?.charAt(0) || (user as any)?.email?.charAt(0) || '?').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">
                  {(user as any)?.firstName || (user as any)?.email?.split('@')[0] || '익명 사용자'}
                </h3>
                <p className="text-sm text-muted-foreground">나의 순위</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">#{userRankInfo.globalRank}</div>
                  <div className="text-xs text-muted-foreground">전체 순위</div>
                </div>
                {userRankInfo.churchRank && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-secondary">#{userRankInfo.churchRank}</div>
                    <div className="text-xs text-muted-foreground">교회 순위</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{userRankInfo.percentile}%</div>
                  <div className="text-xs text-muted-foreground">상위 퍼센트</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGlobalLeaderboard = () => {
    if (globalLoading) return <LoadingSkeleton />;

    if (!globalLeaderboard?.users || globalLeaderboard.users.length === 0) {
      return (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">아직 전체 랭킹 데이터가 없습니다</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {globalLeaderboard.users.map((user: any) => (
          <div
            key={user.id}
            className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors hover:bg-muted/30 ${
              user.rank <= 3 ? 'bg-muted/20' : 'bg-card'
            }`}
            data-testid={`global-rank-${user.rank}`}
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${getRankBadgeColor(user.rank)}`}>
              {user.rank <= 3 ? getRankIcon(user.rank) : <span className="text-sm font-bold">#{user.rank}</span>}
            </div>
            
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profileImageUrl} />
              <AvatarFallback>
                {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="font-medium text-foreground" data-testid={`user-name-${user.id}`}>
                {user.firstName || user.email?.split('@')[0] || '익명 사용자'}
              </h3>
              {user.churchName && (
                <p className="text-sm text-muted-foreground" data-testid={`user-church-${user.id}`}>
                  {user.churchName}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                <span>총 {user.totalWords?.toLocaleString() || 0} 단어</span>
                <span>•</span>
                <span>{user.totalPoints || 0} 포인트</span>
                {timeRange !== 'all' && user.recentSessions && (
                  <>
                    <span>•</span>
                    <span>{user.recentSessions} 세션</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="text-right">
              {globalSortBy === 'totalPoints' && (
                <div className="font-bold text-lg text-foreground" data-testid={`user-points-${user.id}`}>
                  {user.totalPoints?.toLocaleString() || 0} P
                </div>
              )}
              {globalSortBy === 'averageWpm' && (
                <div className="font-bold text-lg text-foreground" data-testid={`user-wpm-${user.id}`}>
                  {Math.round(user.averageWpm || 0)} WPM
                </div>
              )}
              {globalSortBy === 'totalAccuracy' && (
                <div className="font-bold text-lg text-foreground" data-testid={`user-accuracy-${user.id}`}>
                  {Math.round(user.totalAccuracy || 0)}%
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {globalSortBy !== 'averageWpm' && `${Math.round(user.averageWpm || 0)} WPM`}
                {globalSortBy !== 'totalAccuracy' && globalSortBy !== 'averageWpm' && ` • ${Math.round(user.totalAccuracy || 0)}%`}
              </div>
            </div>
          </div>
        ))}
        
        <Pagination 
          total={globalLeaderboard.total || 0} 
          current={currentPage} 
          onChange={setCurrentPage} 
        />
      </div>
    );
  };

  const renderPersonalLeaderboard = () => {
    if (personalLoading) return <LoadingSkeleton />;

    if (!personalLeaderboard || (personalLeaderboard as any[]).length === 0) {
      return (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">아직 개인 랭킹 데이터가 없습니다</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {(personalLeaderboard as any[]).map((user: any, index: number) => {
          const rank = index + 1;
          return (
            <div
              key={user.id}
              className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors hover:bg-muted/30 ${
                rank <= 3 ? 'bg-muted/20' : 'bg-card'
              }`}
              data-testid={`personal-rank-${rank}`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${getRankBadgeColor(rank)}`}>
                {rank <= 3 ? getRankIcon(rank) : <span className="text-sm font-bold">#{rank}</span>}
              </div>
              
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.profileImageUrl} />
                <AvatarFallback>
                  {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="font-medium text-foreground" data-testid={`user-name-${user.id}`}>
                  {user.firstName || user.email?.split('@')[0] || '익명 사용자'}
                </h3>
                {user.churchName && (
                  <p className="text-sm text-muted-foreground" data-testid={`user-church-${user.id}`}>
                    {user.churchName}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                  <span>총 {user.totalWords?.toLocaleString() || 0} 단어</span>
                  <span>•</span>
                  <span>{user.totalPoints || 0} 포인트</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-lg text-foreground" data-testid={`user-wpm-${user.id}`}>
                  {Math.round(user.averageWpm || 0)} WPM
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.round(user.totalAccuracy || 0)}% 정확도
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChurchLeaderboard = () => {
    if (churchLoading) return <LoadingSkeleton />;

    if (!churchLeaderboard?.churches || churchLeaderboard.churches.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">아직 교회 랭킹 데이터가 없습니다</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {churchLeaderboard.churches.map((church: any) => (
          <div
            key={church.id}
            className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors hover:bg-muted/30 ${
              church.rank <= 3 ? 'bg-muted/20' : 'bg-card'
            }`}
            data-testid={`church-rank-${church.rank}`}
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${getRankBadgeColor(church.rank)}`}>
              {church.rank <= 3 ? getRankIcon(church.rank) : <span className="text-sm font-bold">#{church.rank}</span>}
            </div>
            
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium text-foreground" data-testid={`church-name-${church.id}`}>
                {church.name}
              </h3>
              <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                <span>{church.memberCount || 0}명 참여</span>
                <span>•</span>
                <span>{church.activeMembers || 0}명 활성</span>
                {churchSortBy === 'totalPoints' && (
                  <>
                    <span>•</span>
                    <span>{church.totalPoints?.toLocaleString() || 0} 포인트</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="text-right">
              {churchSortBy === 'totalPoints' && (
                <div className="font-bold text-lg text-foreground" data-testid={`church-points-${church.id}`}>
                  {church.totalPoints?.toLocaleString() || 0} P
                </div>
              )}
              {churchSortBy === 'averageWpm' && (
                <div className="font-bold text-lg text-foreground" data-testid={`church-avg-wpm-${church.id}`}>
                  평균 {Math.round(church.averageWpm || 0)} WPM
                </div>
              )}
              {churchSortBy === 'memberCount' && (
                <div className="font-bold text-lg text-foreground" data-testid={`church-members-${church.id}`}>
                  {church.memberCount || 0} 명
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {churchSortBy !== 'averageWpm' && `평균 ${Math.round(church.averageWpm || 0)} WPM`}
              </div>
            </div>
          </div>
        ))}
        
        <Pagination 
          total={churchLeaderboard.total || 0} 
          current={currentPage} 
          onChange={setCurrentPage} 
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center">
            <Trophy className="h-8 w-8 mr-3 text-primary" />
            리더보드
          </h1>
          <p className="text-lg text-muted-foreground">
            전 세계 성도들과 함께 건전한 경쟁을 통해 성장하세요
          </p>
        </div>

        <UserRankCard />

        <Tabs defaultValue="global" className="space-y-6" onValueChange={() => setCurrentPage(1)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="global" className="flex items-center space-x-2" data-testid="tab-global">
              <Globe className="h-4 w-4" />
              <span>전체 랭킹</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center space-x-2" data-testid="tab-personal">
              <TrendingUp className="h-4 w-4" />
              <span>개인 랭킹</span>
            </TabsTrigger>
            <TabsTrigger value="church" className="flex items-center space-x-2" data-testid="tab-church">
              <Users className="h-4 w-4" />
              <span>교회 랭킹</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-primary" />
                    전체 리더보드
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={globalSortBy} onValueChange={(value) => {
                      setGlobalSortBy(value as any);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[140px]" data-testid="select-global-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="totalPoints">총 포인트</SelectItem>
                        <SelectItem value="averageWpm">평균 WPM</SelectItem>
                        <SelectItem value="totalAccuracy">정확도</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={timeRange} onValueChange={(value) => {
                      setTimeRange(value as any);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[100px]" data-testid="select-time-range">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="monthly">이번 달</SelectItem>
                        <SelectItem value="weekly">이번 주</SelectItem>
                        <SelectItem value="daily">오늘</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {getSortLabel(globalSortBy)} 기준
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getTimeRangeLabel(timeRange)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {renderGlobalLeaderboard()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-primary" />
                    개인 리더보드
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    평균 WPM 기준
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderPersonalLeaderboard()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="church">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    교회 리더보드
                  </CardTitle>
                  <Select value={churchSortBy} onValueChange={(value) => {
                    setChurchSortBy(value as any);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-[140px]" data-testid="select-church-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="totalPoints">총 포인트</SelectItem>
                      <SelectItem value="averageWpm">평균 WPM</SelectItem>
                      <SelectItem value="memberCount">멤버 수</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  <Star className="h-3 w-3" />
                  {getSortLabel(churchSortBy)} 기준
                </Badge>
              </CardHeader>
              <CardContent>
                {renderChurchLeaderboard()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}