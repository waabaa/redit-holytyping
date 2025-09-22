import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Trophy, Users, Target, Clock, Award, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Challenges() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["/api/challenges"],
  });

  const joinChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      await apiRequest("POST", `/api/challenges/${challengeId}/join`, {});
    },
    onSuccess: (_, challengeId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId, "progress"] });
      toast({
        title: "성공!",
        description: "챌린지에 참여하셨습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "로그인 후 다시 시도해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "챌린지 참여 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return <Calendar className="h-5 w-5" />;
      case 'weekly':
        return <Trophy className="h-5 w-5" />;
      case 'monthly':
        return <Award className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'weekly':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'monthly':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getChallengeTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return '일일 챌린지';
      case 'weekly':
        return '주간 챌린지';
      case 'monthly':
        return '월간 챌린지';
      default:
        return '챌린지';
    }
  };

  if (challengesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center">
              <Target className="h-8 w-8 mr-3 text-primary" />
              챌린지
            </h1>
            <p className="text-lg text-muted-foreground">로딩 중...</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-2 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center">
            <Target className="h-8 w-8 mr-3 text-primary" />
            챌린지
          </h1>
          <p className="text-lg text-muted-foreground">
            일일, 주간, 월간 챌린지에 참여하여 꾸준한 말씀 묵상 습관을 만드세요
          </p>
        </div>

        {!challenges || challenges.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">활성화된 챌린지가 없습니다</h3>
              <p className="text-muted-foreground mb-6">
                새로운 챌린지가 곧 시작될 예정입니다. 조금만 기다려주세요!
              </p>
              <Link href="/practice">
                <Button data-testid="button-practice-while-waiting">
                  지금 필사 연습하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge: any) => (
              <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getChallengeTypeColor(challenge.type)}>
                      {getChallengeTypeLabel(challenge.type)}
                    </Badge>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      challenge.type === 'daily' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                      challenge.type === 'weekly' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                      'bg-purple-100 text-purple-600 dark:bg-purple-900/30'
                    }`}>
                      {getChallengeIcon(challenge.type)}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold text-foreground" data-testid={`challenge-title-${challenge.id}`}>
                    {challenge.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {challenge.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">요구 조건</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">정확도:</span>
                        <span className="font-medium text-foreground">{challenge.requiredAccuracy}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">속도:</span>
                        <span className="font-medium text-foreground">{challenge.requiredWpm} WPM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        참여자: {(challenge.participantCount || 0).toLocaleString()}명
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-primary font-medium">
                      <Trophy className="h-4 w-4" />
                      <span>+{challenge.pointsReward} 포인트</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {challenge.endDate && (
                      <p>
                        종료: {format(new Date(challenge.endDate), "yyyy년 MM월 dd일")}
                      </p>
                    )}
                  </div>

                  {isAuthenticated ? (
                    <Button
                      className="w-full"
                      onClick={() => joinChallengeMutation.mutate(challenge.id)}
                      disabled={joinChallengeMutation.isPending}
                      data-testid={`button-join-challenge-${challenge.id}`}
                    >
                      {joinChallengeMutation.isPending ? (
                        "참여 중..."
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          챌린지 참여하기
                        </>
                      )}
                    </Button>
                  ) : (
                    <a href="/api/login" className="block">
                      <Button className="w-full" data-testid="button-login-to-join">
                        로그인하고 참여하기
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Challenge Tips */}
        <Card className="mt-12 bible-texture">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-primary" />
              챌린지 참여 가이드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-3">챌린지 종류</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">일일 챌린지</p>
                      <p className="text-sm text-muted-foreground">매일 새로운 구절로 꾸준한 연습</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Trophy className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">주간 챌린지</p>
                      <p className="text-sm text-muted-foreground">일주일 동안 특정 주제 완주</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Award className="h-3 w-3 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">월간 챌린지</p>
                      <p className="text-sm text-muted-foreground">한 달 간의 장기 도전</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-3">성공 팁</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>정확도를 우선시하고 속도는 자연스럽게 늘려가세요</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>매일 조금씩이라도 꾸준히 참여하세요</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>말씀의 의미를 생각하며 타이핑하세요</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>다른 참가자들과 격려하며 함께 성장하세요</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
