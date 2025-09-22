import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  Crown, 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Award,
  ArrowLeft,
  UserPlus,
  Settings,
  BarChart3
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { Church, User } from "@shared/schema";

// Update Church Form Schema
const updateChurchSchema = z.object({
  name: z.string().min(1, "교회 이름을 입력해주세요").max(100, "교회 이름은 100자 이내로 입력해주세요"),
  description: z.string().optional(),
});

type UpdateChurchFormData = z.infer<typeof updateChurchSchema>;

export default function ChurchDetail() {
  const { id: churchId } = useParams();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: church, isLoading: churchLoading, error: churchError } = useQuery<Church>({
    queryKey: ["/api/churches", churchId],
    enabled: !!churchId,
  });

  const { data: userChurch } = useQuery<Church | null>({
    queryKey: ["/api/user/church"],
    enabled: isAuthenticated,
  });

  // Fetch church members
  const { data: churchMembers, isLoading: membersLoading } = useQuery<Array<User & { isAdmin: boolean }>>({
    queryKey: ["/api/churches", churchId, "members"],
    enabled: !!churchId,
  });
  const membersArray = churchMembers || [];

  // Form for updating church info
  const editForm = useForm<UpdateChurchFormData>({
    resolver: zodResolver(updateChurchSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Update form values when church data loads
  useEffect(() => {
    if (church) {
      editForm.reset({
        name: church.name,
        description: church.description || "",
      });
    }
  }, [church, editForm]);

  const updateChurchMutation = useMutation({
    mutationFn: async (data: UpdateChurchFormData) => {
      const response = await apiRequest("PATCH", `/api/churches/${churchId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "교회 정보가 성공적으로 수정되었습니다!",
        description: "변경사항이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/churches", churchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/churches"] });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "교회 정보 수정에 실패했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateChurch = (data: UpdateChurchFormData) => {
    updateChurchMutation.mutate(data);
  };

  const joinChurchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/churches/${churchId}/join`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "교회에 성공적으로 참여했습니다!",
        description: `${church?.name}의 일원이 되신 것을 환영합니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/churches", churchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/church"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/churches"] });
    },
    onError: (error: any) => {
      toast({
        title: "교회 참여에 실패했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (churchLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="h-64 bg-muted rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (churchError || !church) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">교회를 찾을 수 없습니다</h2>
            <p className="text-muted-foreground mb-6">
              요청하신 교회가 존재하지 않거나 삭제되었을 수 있습니다.
            </p>
            <Link href="/churches">
              <Button data-testid="button-back-to-churches">
                교회 목록으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = (user as any)?.id === church.adminId;
  const isMember = userChurch?.id === church.id;
  const canJoin = !userChurch && !isMember;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/churches">
            <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              <span>교회 목록으로</span>
            </Button>
          </Link>
        </div>

        {/* Church Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="church-name">
                    {church.name}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    {isAdmin && (
                      <Badge variant="default" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        관리자
                      </Badge>
                    )}
                    {isMember && !isAdmin && (
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        멤버
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {canJoin && (
                  <Button
                    onClick={() => joinChurchMutation.mutate()}
                    disabled={joinChurchMutation.isPending}
                    className="flex items-center space-x-2"
                    data-testid="button-join-church"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{joinChurchMutation.isPending ? "참여 중..." : "교회 참여"}</span>
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="outline" className="flex items-center space-x-2" data-testid="button-admin-settings">
                    <Settings className="h-4 w-4" />
                    <span>관리</span>
                  </Button>
                )}
              </div>
            </div>
            
            {church.description && (
              <p className="text-muted-foreground mt-4" data-testid="church-description">
                {church.description}
              </p>
            )}
            
            {/* Church Code Display */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">교회 코드:</span>
                <code className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-mono" data-testid="church-code">
                  {(church as any).churchCode || 'N/A'}
                </code>
                <span className="text-xs text-muted-foreground">
                  (다른 성도들과 공유하세요)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Church Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                교회 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">총 멤버</span>
                  <span className="font-bold text-foreground" data-testid="church-member-count">
                    {church.totalMembers || 0}명
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">총 포인트</span>
                  <span className="font-bold text-primary" data-testid="church-total-points">
                    {(church.totalPoints || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">교회 순위</span>
                  <Badge variant="outline" data-testid="church-rank">
                    #순위 집계중
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">생성일</span>
                  <span className="text-sm text-muted-foreground" data-testid="church-created-date">
                    {church.createdAt ? new Date(church.createdAt).toLocaleDateString('ko-KR') : '정보 없음'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 실행</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/practice">
                <Button className="w-full justify-start" data-testid="button-practice">
                  <Award className="h-4 w-4 mr-2" />
                  교회를 위해 필사하기
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" className="w-full justify-start" data-testid="button-leaderboard">
                  <Trophy className="h-4 w-4 mr-2" />
                  교회 랭킹 보기
                </Button>
              </Link>
              <Link href="/challenges">
                <Button variant="outline" className="w-full justify-start" data-testid="button-challenges">
                  <Calendar className="h-4 w-4 mr-2" />
                  챌린지 참여하기
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Section */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                  관리자 전용
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-members">
                  <Users className="h-4 w-4 mr-2" />
                  멤버 관리
                </Button>
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" data-testid="button-edit-church">
                      <Settings className="h-4 w-4 mr-2" />
                      교회 정보 수정
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>교회 정보 수정</DialogTitle>
                    </DialogHeader>
                    <Form {...editForm}>
                      <form onSubmit={editForm.handleSubmit(handleUpdateChurch)} className="space-y-4">
                        <FormField
                          control={editForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>교회 이름</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="교회 이름을 입력하세요" 
                                  data-testid="input-edit-church-name"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>교회 소개 (선택사항)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="교회에 대한 간단한 소개를 적어주세요"
                                  data-testid="input-edit-church-description"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
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
                            disabled={updateChurchMutation.isPending}
                            data-testid="button-submit-edit"
                          >
                            {updateChurchMutation.isPending ? "수정 중..." : "수정하기"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="w-full justify-start" data-testid="button-church-stats">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  상세 통계
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detailed Content */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="members" className="flex items-center space-x-2" data-testid="tab-members">
              <Users className="h-4 w-4" />
              <span>멤버</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2" data-testid="tab-activity">
              <TrendingUp className="h-4 w-4" />
              <span>활동</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    교회 멤버
                  </div>
                  <Badge variant="outline">{church.totalMembers || 0}명</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-muted rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-4 bg-muted rounded w-16"></div>
                          <div className="h-3 bg-muted rounded w-12"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !membersArray || membersArray.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">아직 멤버가 없습니다</h3>
                    <p className="text-muted-foreground">
                      첫 번째 멤버가 되어보세요!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {membersArray.map((member, index) => (
                      <div key={member.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {(member.firstName?.charAt(0) || member.email?.charAt(0) || '?').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground" data-testid={`member-name-${member.id}`}>
                            {member.firstName || member.email?.split('@')[0] || '익명 사용자'}
                            {member.isAdmin && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                관리자
                              </Badge>
                            )}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                            <span>총 {member.totalWords?.toLocaleString() || 0} 단어</span>
                            <span>•</span>
                            <span>{member.totalPoints || 0} 포인트</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-foreground" data-testid={`member-wpm-${member.id}`}>
                            {Math.round(member.averageWpm || 0)} WPM
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {Math.round(member.totalAccuracy || 0)}% 정확도
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  최근 활동
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">활동 내역</h3>
                  <p className="text-muted-foreground">
                    곧 교회의 최근 활동 내역을 확인할 수 있습니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}