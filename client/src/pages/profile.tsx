import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User as UserIcon, 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Award, 
  Target, 
  Clock, 
  Users,
  ChevronRight,
  BookOpen,
  BarChart3,
  Edit,
  Search,
  Loader2,
  MapPin,
  BarChart2
} from "lucide-react";
import { Link } from "wouter";
import StatsDisplay from "@/components/stats-display";
import { format } from "date-fns";
import type { User, TypingSession, Church } from "@shared/schema";

// Form validation schema
const editProfileSchema = z.object({
  firstName: z.string().min(1, "이름은 필수입니다").max(100, "이름은 100자를 초과할 수 없습니다"),
  age: z.number().min(10, "연령은 10세 이상이어야 합니다").max(100, "연령은 100세 이하여야 합니다").optional(),
  region: z.string().max(100).optional(),
  churchId: z.string().nullable().optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

// 한국 시/도 목록
const koreanRegions = [
  "서울특별시",
  "부산광역시", 
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

// 연령 옵션 생성 (10-90세)
const generateAgeOptions = () => {
  const ages = [];
  for (let age = 10; age <= 90; age++) {
    ages.push(age);
  }
  return ages;
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [churchSearch, setChurchSearch] = useState("");
  const [isChurchSearchOpen, setIsChurchSearchOpen] = useState(false);

  const { data: userStats, isLoading: statsLoading } = useQuery<{
    averageWpm: number;
    averageAccuracy: number;
    totalWords: number;
    totalSessions: number;
  }>({
    queryKey: ["/api/user/stats"],
  });

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery<TypingSession[]>({
    queryKey: ["/api/typing/sessions"],
  });

  const { data: userChurch } = useQuery<Church | null>({
    queryKey: ["/api/user/church"],
  });

  const { data: personalRanking } = useQuery({
    queryKey: ["/api/leaderboard/personal"],
    select: (data: User[]) => {
      if (!data || !user) return null;
      const userIndex = data.findIndex((u: User) => u.id === (user as User).id);
      return userIndex >= 0 ? userIndex + 1 : null;
    }
  });

  const getPerformanceLevel = (wpm: number) => {
    if (wpm >= 80) return { label: "Expert", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" };
    if (wpm >= 60) return { label: "Advanced", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" };
    if (wpm >= 40) return { label: "Intermediate", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" };
    return { label: "Beginner", color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" };
  };

  const level = getPerformanceLevel(userStats?.averageWpm || 0);

  // 프로필 완성도 계산
  const calculateProfileCompletion = (user: User | null) => {
    if (!user) return { percentage: 0, completedFields: 0, totalFields: 5 };
    
    const fields = [
      user.firstName,
      user.email, 
      user.age,
      user.region,
      user.churchId
    ];
    
    const completedFields = fields.filter(field => field !== null && field !== undefined && field !== '').length;
    const totalFields = fields.length;
    const percentage = Math.round((completedFields / totalFields) * 100);
    
    return { percentage, completedFields, totalFields };
  };

  const profileCompletion = calculateProfileCompletion(user as User);

  // Handle keyboard events for profile completion hint
  const handleProfileCompletionKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleEditModalOpen();
    }
  };

  // Edit form setup
  const editForm = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: (user as User)?.firstName || "",
      age: (user as User)?.age || undefined,
      region: (user as User)?.region || undefined,
      churchId: (user as User)?.churchId || undefined,
    },
  });

  // 교회 목록 조회
  const { data: churches, isLoading: churchesLoading } = useQuery<Church[]>({
    queryKey: ["/api/churches", { search: churchSearch }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (churchSearch.trim()) {
        params.append("search", churchSearch.trim());
      }
      params.append("limit", "20");
      return fetch(`/api/churches?${params.toString()}`).then(res => res.json());
    },
    enabled: isChurchSearchOpen,
  });

  // 프로필 업데이트 mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileFormData) => {
      const response = await apiRequest("PATCH", "/api/users/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "프로필이 업데이트되었습니다!",
        description: "변경사항이 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "프로필 업데이트에 실패했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const onEditSubmit = (data: EditProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleChurchSelect = (churchId: string, churchName: string) => {
    editForm.setValue("churchId", churchId);
    setIsChurchSearchOpen(false);
    setChurchSearch(churchName);
  };

  const selectedChurch = churches?.find(church => church.id === editForm.watch("churchId"));

  // Reset form when modal opens
  const handleEditModalOpen = () => {
    editForm.reset({
      firstName: (user as User)?.firstName || "",
      age: (user as User)?.age || undefined,
      region: (user as User)?.region || undefined,
      churchId: (user as User)?.churchId || undefined,
    });
    setChurchSearch(userChurch?.name || "");
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-start space-x-6 p-6 bg-card border border-border rounded-xl">
            <Avatar className="h-20 w-20">
              <AvatarImage src={(user as User)?.profileImageUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {((user as User)?.firstName?.charAt(0) || (user as User)?.email?.charAt(0) || '?').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2" data-testid="text-user-name">
                {(user as User)?.firstName || (user as User)?.email?.split('@')[0] || '익명 사용자'}님
              </h1>
              <p className="text-muted-foreground mb-4">
                {(user as User)?.email}
              </p>

              {/* 개인 정보 섹션 */}
              <div className="space-y-3 mb-4">
                {/* 나이 정보 */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    나이: {(user as User)?.age ? (
                      <span className="font-medium" data-testid="text-user-age">{(user as User).age}세</span>
                    ) : (
                      <span className="text-muted-foreground" data-testid="text-age-unset">미설정</span>
                    )}
                  </span>
                </div>

                {/* 지역 정보 */}
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    지역: {(user as User)?.region ? (
                      <span className="font-medium" data-testid="text-user-region">{(user as User).region}</span>
                    ) : (
                      <span className="text-muted-foreground" data-testid="text-region-unset">미설정</span>
                    )}
                  </span>
                </div>

                {/* 프로필 완성도 */}
                <div className="flex items-center space-x-2">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">프로필 완성도</span>
                      <span className="text-sm font-medium text-primary" data-testid="text-completion-percentage">
                        {profileCompletion.percentage}%
                      </span>
                    </div>
                    <Progress value={profileCompletion.percentage} className="w-full h-2" data-testid="progress-completion" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {profileCompletion.completedFields}/{profileCompletion.totalFields} 항목 완료
                      {profileCompletion.percentage < 100 && (
                        <span 
                          className="text-primary cursor-pointer hover:underline hover:text-primary/80 ml-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1 transition-colors"
                          role="button"
                          tabIndex={0}
                          onClick={handleEditModalOpen}
                          onKeyDown={handleProfileCompletionKeyDown}
                          data-testid="link-complete-profile"
                        >
                          → 편집하여 완성하기
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                <Badge className={`${level.bg} ${level.color}`}>
                  {level.label} 타이피스트
                </Badge>
                {personalRanking && (
                  <Badge variant="outline">
                    전체 #{personalRanking}위
                  </Badge>
                )}
                {userChurch?.name && (
                  <Badge variant="secondary" data-testid="badge-church">
                    {userChurch.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="text-2xl font-bold text-primary" data-testid="text-total-points">
                {(user as User)?.totalPoints || 0}
              </div>
              <div className="text-sm text-muted-foreground">포인트</div>
              
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleEditModalOpen}
                    data-testid="button-edit-profile"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    프로필 편집
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>프로필 편집</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                      {/* 이름 입력 */}
                      <FormField
                        control={editForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <UserIcon className="h-4 w-4 mr-2" />
                              이름 (필수)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="이름을 입력해주세요"
                                data-testid="input-firstName"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 연령 선택 */}
                      <FormField
                        control={editForm.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              연령 (선택사항)
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-age">
                                  <SelectValue placeholder="연령을 선택해주세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {generateAgeOptions().map((age) => (
                                  <SelectItem key={age} value={age.toString()}>
                                    {age}세
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 지역 선택 */}
                      <FormField
                        control={editForm.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              지역 (선택사항)
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-region">
                                  <SelectValue placeholder="거주 지역을 선택해주세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {koreanRegions.map((region) => (
                                  <SelectItem key={region} value={region}>
                                    {region}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 교회 선택 */}
                      <FormField
                        control={editForm.control}
                        name="churchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              교회 (선택사항)
                            </FormLabel>
                            <div className="space-y-3">
                              {/* 교회 검색 입력 */}
                              <div className="flex space-x-2">
                                <Input
                                  placeholder="교회명을 검색해주세요"
                                  value={churchSearch}
                                  onChange={(e) => {
                                    setChurchSearch(e.target.value);
                                    setIsChurchSearchOpen(true);
                                  }}
                                  data-testid="input-church-search"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsChurchSearchOpen(true)}
                                  disabled={churchesLoading}
                                  data-testid="button-search-church"
                                >
                                  {churchesLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Search className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>

                              {/* 현재 선택된 교회 표시 */}
                              {selectedChurch && (
                                <div className="p-3 bg-muted rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{selectedChurch.name}</p>
                                      {selectedChurch.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {selectedChurch.description}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        field.onChange(null);
                                        setChurchSearch("");
                                      }}
                                      data-testid="button-remove-church"
                                    >
                                      제거
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* 교회 검색 결과 */}
                              {isChurchSearchOpen && churches && churches.length > 0 && (
                                <div className="border rounded-lg max-h-48 overflow-y-auto">
                                  {churches.map((church) => (
                                    <div
                                      key={church.id}
                                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                      onClick={() => handleChurchSelect(church.id, church.name)}
                                      data-testid={`church-option-${church.id}`}
                                    >
                                      <div className="font-medium">{church.name}</div>
                                      {church.description && (
                                        <div className="text-sm text-muted-foreground">
                                          {church.description}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {isChurchSearchOpen && churches && churches.length === 0 && churchSearch && (
                                <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 버튼 그룹 */}
                      <div className="flex justify-end space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditModalOpen(false)}
                          data-testid="button-cancel-edit"
                        >
                          취소
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              저장 중...
                            </>
                          ) : (
                            '프로필 저장'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                나의 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="text-center space-y-2">
                      <div className="h-8 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-primary" data-testid="stat-avg-wpm">
                      {Math.round(userStats?.averageWpm || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">평균 WPM</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-avg-accuracy">
                      {Math.round(userStats?.averageAccuracy || 0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">평균 정확도</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-words">
                      {(userStats?.totalWords || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">총 타이핑 단어</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-purple-600" data-testid="stat-total-sessions">
                      {userStats?.totalSessions || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">총 세션</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 실행</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/practice">
                <Button className="w-full justify-between" data-testid="button-quick-practice">
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2" />
                    필사 연습하기
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/challenges">
                <Button variant="outline" className="w-full justify-between" data-testid="button-quick-challenges">
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    챌린지 참여
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" className="w-full justify-between" data-testid="button-quick-leaderboard">
                  <div className="flex items-center">
                    <Trophy className="h-4 w-4 mr-2" />
                    리더보드 보기
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Content */}
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sessions" className="flex items-center space-x-2" data-testid="tab-sessions">
              <Clock className="h-4 w-4" />
              <span>최근 활동</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center space-x-2" data-testid="tab-achievements">
              <Award className="h-4 w-4" />
              <span>성취</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    최근 타이핑 세션
                  </div>
                  {(recentSessions?.length ?? 0) > 0 && (
                    <Badge variant="outline">{recentSessions?.length}개 세션</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-muted rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="h-4 bg-muted rounded w-16"></div>
                          <div className="h-3 bg-muted rounded w-12"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !recentSessions || (recentSessions?.length ?? 0) === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">아직 활동이 없습니다</h3>
                    <p className="text-muted-foreground mb-6">
                      첫 번째 성경 필사를 시작해보세요!
                    </p>
                    <Link href="/practice">
                      <Button data-testid="button-start-first-practice">
                        필사 시작하기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSessions?.map((session: TypingSession) => (
                      <div key={session.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              KO
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {session.completedAt && format(new Date(session.completedAt), "MM/dd HH:mm")}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.wordsTyped}단어 • {session.timeSpent}초
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            {Math.round(session.wpm)} WPM
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {Math.round(session.accuracy)}% 정확도
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium text-primary">
                            +{session.pointsEarned || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">포인트</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-primary" />
                  성취 및 배지
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Sample achievements based on user stats */}
                  {(userStats?.totalSessions ?? 0) >= 1 && (
                    <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">첫 걸음</h4>
                        <p className="text-sm text-muted-foreground">첫 번째 필사 완료</p>
                      </div>
                    </div>
                  )}
                  
                  {(userStats?.averageWpm ?? 0) >= 30 && (
                    <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">속도향상</h4>
                        <p className="text-sm text-muted-foreground">30 WPM 달성</p>
                      </div>
                    </div>
                  )}
                  
                  {(userStats?.averageAccuracy ?? 0) >= 95 && (
                    <div className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <Target className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">정확한 손</h4>
                        <p className="text-sm text-muted-foreground">95% 정확도 달성</p>
                      </div>
                    </div>
                  )}
                  
                  {(userStats?.totalSessions ?? 0) >= 10 && (
                    <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">꾸준함</h4>
                        <p className="text-sm text-muted-foreground">10회 세션 완료</p>
                      </div>
                    </div>
                  )}
                  
                  {userChurch && (
                    <div className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">공동체</h4>
                        <p className="text-sm text-muted-foreground">교회 참여</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {(!userStats || userStats.totalSessions === 0) && (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      성경 필사를 시작하여 첫 번째 성취를 획득해보세요!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
