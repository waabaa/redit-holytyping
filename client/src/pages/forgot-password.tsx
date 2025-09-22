import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type RequestState = 'idle' | 'pending' | 'success' | 'error';

interface ForgotPasswordResponse {
  message: string;
  email?: string;
}

// 비밀번호 리셋 요청 폼 스키마
const forgotPasswordSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [submittedEmail, setSubmittedEmail] = useState<string>('');

  // 비밀번호 리셋 요청 폼
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // 비밀번호 리셋 요청 mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      setRequestState('pending');
      const response = await apiRequest('POST', '/api/auth/forgot-password', data);
      return response.json();
    },
    onSuccess: (data: ForgotPasswordResponse) => {
      setRequestState('success');
      setSubmittedEmail(data.email || form.getValues('email'));
      
      toast({
        title: "이메일 발송 완료! ✉️",
        description: "비밀번호 재설정 링크가 이메일로 발송되었습니다.",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      console.error('Forgot password error:', error);
      setRequestState('error');
      
      // Parse error message for user-friendly display
      let errorMessage = "비밀번호 재설정 요청 중 오류가 발생했습니다. 다시 시도해주세요.";
      
      const errorMsg = error.message;
      if (errorMsg.includes("이메일 서비스가 일시적으로 사용할 수 없습니다")) {
        errorMessage = "이메일 서비스가 일시적으로 사용할 수 없습니다. 관리자에게 문의해주세요.";
      } else if (errorMsg.includes("입력 데이터가 올바르지 않습니다")) {
        errorMessage = "입력 데이터가 올바르지 않습니다. 이메일 주소를 확인해주세요.";
      }
      
      toast({
        variant: "destructive",
        title: "요청 실패",
        description: errorMessage,
      });
    },
  });

  const handleSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  const handleBackToLogin = () => {
    navigate('/');
  };

  const handleTryAgain = () => {
    setRequestState('idle');
    form.reset();
  };

  // 성공 상태 UI
  if (requestState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="title-success">
              이메일 발송 완료
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription data-testid="text-success-message">
                <span className="font-medium">{submittedEmail}</span>로 비밀번호 재설정 링크를 발송했습니다.
                <br />
                <br />
                이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정해주세요.
                <br />
                <br />
                <span className="text-sm text-muted-foreground">
                  * 이메일이 오지 않았다면 스팸함을 확인해주세요.
                  <br />
                  * 링크는 1시간 후 만료됩니다.
                </span>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleTryAgain}
                variant="outline"
                className="w-full"
                data-testid="button-try-again"
              >
                다른 이메일로 다시 시도
              </Button>
              
              <Button
                onClick={handleBackToLogin}
                variant="ghost"
                className="w-full"
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                로그인 페이지로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 메인 폼 UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="title-forgot-password">
            비밀번호 재설정
          </CardTitle>
          <p className="text-sm text-muted-foreground" data-testid="text-description">
            가입 시 사용한 이메일 주소를 입력하시면,
            <br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-email">이메일 주소</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          className="pl-10"
                          data-testid="input-email"
                          disabled={requestState === 'pending'}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage data-testid="error-email" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                data-testid="button-submit"
                disabled={requestState === 'pending'}
              >
                {requestState === 'pending' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    재설정 링크 발송
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <Button
              onClick={handleBackToLogin}
              variant="ghost"
              className="text-sm"
              data-testid="button-back-to-login-bottom"
              disabled={requestState === 'pending'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              로그인 페이지로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}