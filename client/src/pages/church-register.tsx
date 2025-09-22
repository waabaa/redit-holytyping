import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  CheckCircle, 
  ArrowLeft,
  Info,
  Plus,
  Church
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

// Form Schema
const createChurchSchema = z.object({
  name: z.string().min(1, "교회 이름을 입력해주세요").max(100, "교회 이름은 100자 이내로 입력해주세요"),
  description: z.string().optional(),
});

type CreateChurchFormData = z.infer<typeof createChurchSchema>;

export default function ChurchRegister() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const form = useForm<CreateChurchFormData>({
    resolver: zodResolver(createChurchSchema),
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
    onSuccess: (data) => {
      toast({
        title: "교회가 성공적으로 생성되었습니다!",
        description: `${data.name}의 관리자가 되었습니다. 교회 코드를 통해 다른 성도들을 초대하세요.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/churches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/church"] });
      
      // Redirect to the new church detail page
      navigate(`/churches/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "교회 생성에 실패했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateChurchFormData) => {
    createChurchMutation.mutate(data);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground mb-6">
              교회를 생성하려면 먼저 로그인해주세요.
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link href="/churches">
              <Button variant="ghost" size="sm" data-testid="back-to-churches">
                <ArrowLeft className="h-4 w-4 mr-2" />
                교회 그룹으로 돌아가기
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Church className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              새 교회 그룹 생성
            </h1>
            <p className="text-lg text-muted-foreground">
              성경 필사를 함께할 교회 그룹을 만들어보세요
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Alert className="mb-8">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>교회 그룹을 만들면:</strong>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• 고유한 8자리 교회 코드가 자동으로 생성됩니다</li>
              <li>• 다른 성도들이 코드를 통해 쉽게 참여할 수 있습니다</li>
              <li>• 교회별 통계와 랭킹을 확인할 수 있습니다</li>
              <li>• 당신이 교회의 관리자가 됩니다</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2 text-primary" />
              교회 정보 입력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>교회 이름 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="예: 새소망교회, 온누리교회" 
                          data-testid="input-church-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>교회 소개 (선택사항)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="교회에 대한 간단한 소개나 목표를 적어주세요&#10;예: 말씀과 기도로 하나되어 성장하는 공동체"
                          data-testid="input-church-description"
                          rows={4}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Link href="/churches" className="sm:w-auto w-full">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      data-testid="button-cancel-register"
                    >
                      취소
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={createChurchMutation.isPending}
                    className="flex-1 sm:flex-none sm:min-w-32"
                    data-testid="button-submit-register"
                  >
                    {createChurchMutation.isPending ? (
                      <>생성 중...</>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        교회 생성하기
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            교회 생성 후 교회 코드를 통해 다른 성도들을 초대하실 수 있습니다.
          </p>
          <p className="mt-1">
            교회 정보는 언제든지 수정할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}