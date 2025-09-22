import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Plus, Search, ChevronRight, MapPin, Crown } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChurchSchema } from "@shared/schema";
import { z } from "zod";
import type { Church } from "@shared/schema";

// Form validation schema
const createChurchFormSchema = insertChurchSchema.omit({ adminId: true });
type CreateChurchFormData = z.infer<typeof createChurchFormSchema>;

export default function Churches() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinByCodeModalOpen, setIsJoinByCodeModalOpen] = useState(false);
  const [churchCode, setChurchCode] = useState("");

  const { data: churches, isLoading: churchesLoading } = useQuery<Church[]>({
    queryKey: ["/api/leaderboard/churches", { limit: 50 }],
  });

  const { data: userChurch } = useQuery<Church | null>({
    queryKey: ["/api/user/church"],
    enabled: isAuthenticated,
  });

  const form = useForm<CreateChurchFormData>({
    resolver: zodResolver(createChurchFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createChurchMutation = useMutation({
    mutationFn: async (data: CreateChurchFormData) => {
      const response = await apiRequest("POST", "/api/churches", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "교회가 성공적으로 생성되었습니다!",
        description: "이제 다른 성도들을 초대하여 함께 성장해보세요.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/church"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "교회 생성에 실패했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const joinChurchMutation = useMutation({
    mutationFn: async (churchId: string) => {
      const response = await apiRequest("POST", `/api/churches/${churchId}/join`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "교회에 성공적으로 참여했습니다!",
        description: "함께 말씀과 타이핑 연습을 즐겨보세요.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/church"] });
    },
    onError: (error: any) => {
      toast({
        title: "교회 참여에 실패했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const joinByCodeMutation = useMutation({
    mutationFn: async (churchCode: string) => {
      const response = await apiRequest("POST", "/api/churches/join-by-code", { churchCode });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "교회에 성공적으로 참여했습니다!",
        description: "교회 코드로 가입이 완료되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/church"] });
      setIsJoinByCodeModalOpen(false);
      setChurchCode("");
    },
    onError: (error: any) => {
      toast({
        title: "교회 코드 가입에 실패했습니다",
        description: error.message || "올바른 교회 코드를 입력해주세요.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateChurchFormData) => {
    createChurchMutation.mutate(data);
  };

  const handleJoinChurch = (churchId: string, churchName: string) => {
    if (userChurch) {
      toast({
        title: "이미 교회에 소속되어 있습니다",
        description: `현재 "${userChurch.name}"에 참여하고 있습니다.`,
        variant: "destructive",
      });
      return;
    }
    joinChurchMutation.mutate(churchId);
  };

  const handleJoinByCode = () => {
    if (userChurch) {
      toast({
        title: "이미 교회에 소속되어 있습니다",
        description: `현재 "${userChurch.name}"에 참여하고 있습니다.`,
        variant: "destructive",
      });
      return;
    }

    if (!churchCode.trim()) {
      toast({
        title: "교회 코드를 입력해주세요",
        description: "유효한 교회 코드를 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    joinByCodeMutation.mutate(churchCode.trim().toUpperCase());
  };

  // Filter churches based on search query
  const filteredChurches = churches?.filter(church =>
    church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    church.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground mb-6">
              교회 그룹에 참여하려면 먼저 로그인해주세요.
            </p>
            <a href="/api/auth/login">
              <Button data-testid="login-required-btn">
                로그인하기
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center">
            <Users className="h-8 w-8 mr-3 text-primary" />
            교회 그룹
          </h1>
          <p className="text-lg text-muted-foreground">
            전 세계 교회와 함께 성경 필사로 하나가 되어보세요
          </p>
        </div>

        {/* Current Church Status */}
        {userChurch && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground" data-testid="current-church-name">
                      현재 소속: {userChurch.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {userChurch.totalMembers || 0}명의 성도와 함께하고 있습니다
                    </p>
                  </div>
                </div>
                <Link href={`/churches/${userChurch.id}`}>
                  <Button variant="outline" data-testid="view-my-church">
                    교회 보기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="교회 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-churches"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {/* Join by Code Button */}
            <Dialog open={isJoinByCodeModalOpen} onOpenChange={setIsJoinByCodeModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2" data-testid="button-join-by-code">
                  <Users className="h-4 w-4" />
                  <span>교회 코드로 가입</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>교회 코드로 가입</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    교회에서 받은 8자리 교회 코드를 입력하세요.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="churchCode">교회 코드</Label>
                    <Input
                      id="churchCode"
                      placeholder="예: A2B9K7M3"
                      value={churchCode}
                      onChange={(e) => setChurchCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      className="font-mono text-center"
                      data-testid="input-church-code"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsJoinByCodeModalOpen(false);
                        setChurchCode("");
                      }}
                      data-testid="button-cancel-join"
                    >
                      취소
                    </Button>
                    <Button 
                      onClick={handleJoinByCode}
                      disabled={joinByCodeMutation.isPending || !churchCode.trim()}
                      data-testid="button-submit-join"
                    >
                      {joinByCodeMutation.isPending ? "가입 중..." : "교회 가입"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Create Church Button */}
            <Link href="/churches/register">
              <Button className="flex items-center space-x-2" data-testid="button-create-church">
                <Plus className="h-4 w-4" />
                <span>교회 생성</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Churches List */}
        <div className="space-y-4">
          {churchesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-6 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-10 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredChurches.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                {searchQuery ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      검색 결과가 없습니다
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      "{searchQuery}"에 대한 교회를 찾을 수 없습니다.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchQuery("")}
                      data-testid="button-clear-search"
                    >
                      전체 목록 보기
                    </Button>
                  </>
                ) : (
                  <>
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      아직 등록된 교회가 없습니다
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      첫 번째 교회 그룹을 만들어보세요!
                    </p>
                    <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-first-church">
                      교회 생성하기
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChurches.map((church) => (
                <Card key={church.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground" data-testid={`church-name-${church.id}`}>
                            {church.name}
                          </h3>
                          {(user as any)?.id === church.adminId && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              <Crown className="h-3 w-3 mr-1" />
                              관리자
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {church.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-testid={`church-description-${church.id}`}>
                        {church.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">멤버</span>
                        <span className="font-medium" data-testid={`church-members-${church.id}`}>
                          {church.totalMembers || 0}명
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">총 점수</span>
                        <span className="font-medium text-primary" data-testid={`church-points-${church.id}`}>
                          {church.totalPoints || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Link href={`/churches/${church.id}`}>
                        <Button variant="outline" className="w-full justify-between" data-testid={`button-view-church-${church.id}`}>
                          <span>자세히 보기</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      {!userChurch && (user as any)?.id !== church.adminId && (
                        <Button 
                          className="w-full"
                          onClick={() => handleJoinChurch(church.id, church.name)}
                          disabled={joinChurchMutation.isPending}
                          data-testid={`button-join-church-${church.id}`}
                        >
                          {joinChurchMutation.isPending ? "참여 중..." : "참여하기"}
                        </Button>
                      )}
                      
                      {userChurch?.id === church.id && (
                        <Badge variant="default" className="w-full justify-center">
                          소속 교회
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}