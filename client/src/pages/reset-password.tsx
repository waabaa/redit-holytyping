import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft, Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
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

type ResetState = 'idle' | 'pending' | 'success' | 'error' | 'invalid-token';

interface ResetPasswordResponse {
  message: string;
  email?: string;
}

// 비밀번호 재설정 폼 스키마
const resetPasswordSchema = z.object({
  password: z.string().min(8, "비밀번호는 최소 8자리 이상이어야 합니다"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [resetState, setResetState] = useState<ResetState>('idle');
  const [token, setToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 비밀번호 재설정 폼
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (!resetToken) {
      setResetState('invalid-token');
      setErrorMessage('비밀번호 재설정 토큰이 없습니다. 이메일에서 올바른 링크를 클릭해주세요.');
      return;
    }
    
    setToken(resetToken);
  }, []);

  // 비밀번호 재설정 mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      setResetState('pending');
      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: (data: ResetPasswordResponse) => {
      setResetState('success');
      setUserEmail(data.email || '');
      
      toast({
        title: "비밀번호 재설정 완료! ✅",
        description: "새로운 비밀번호로 로그인해주세요.",
        duration: 5000,
      });

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    },
    onError: (error: Error) => {
      console.error('Reset password error:', error);
      setResetState('error');
      
      // Parse error message for user-friendly display
      const errorMsg = error.message;
      
      if (errorMsg.includes('재설정 토큰이 유효하지 않거나 만료되었습니다')) {
        setErrorMessage('재설정 토큰이 유효하지 않거나 만료되었습니다. 새로운 비밀번호 재설정을 요청해주세요.');
      } else if (errorMsg.includes('이미 사용된 재설정 토큰입니다')) {
        setErrorMessage('이미 사용된 재설정 토큰입니다. 새로운 비밀번호 재설정을 요청해주세요.');
      } else if (errorMsg.includes('입력 데이터가 올바르지 않습니다')) {
        setErrorMessage('입력 데이터가 올바르지 않습니다. 비밀번호를 확인해주세요.');
      } else {
        setErrorMessage('비밀번호 재설정 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
      
      toast({
        variant: "destructive",
        title: "재설정 실패",
        description: errorMessage,
      });
    },
  });

  const handleSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data);
  };

  const handleBackToLogin = () => {
    navigate('/');
  };

  const handleRequestNewReset = () => {
    navigate('/forgot-password');
  };

  // 토큰이 없는 경우
  if (resetState === 'invalid-token') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="title-invalid-token">
              토큰이 유효하지 않습니다
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription data-testid="text-invalid-token-message">
                {errorMessage}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleRequestNewReset}
                className="w-full"
                data-testid="button-request-new-reset"
              >
                새로운 비밀번호 재설정 요청
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

  // 성공 상태
  if (resetState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="title-success">
              비밀번호 재설정 완료
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription data-testid="text-success-message">
                비밀번호가 성공적으로 재설정되었습니다.
                <br />
                <br />
                {userEmail && (
                  <>
                    <span className="font-medium">{userEmail}</span> 계정에 대한 새로운 비밀번호로 로그인해주세요.
                    <br />
                    <br />
                  </>
                )}
                <span className="text-sm text-muted-foreground">
                  * 잠시 후 로그인 페이지로 자동 이동됩니다.
                </span>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleBackToLogin}
              className="w-full"
              data-testid="button-login-now"
            >
              지금 로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 오류 상태
  if (resetState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="title-error">
              재설정 실패
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription data-testid="text-error-message">
                {errorMessage}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleRequestNewReset}
                className="w-full"
                data-testid="button-request-new-reset-error"
              >
                새로운 비밀번호 재설정 요청
              </Button>
              
              <Button
                onClick={handleBackToLogin}
                variant="ghost"
                className="w-full"
                data-testid="button-back-to-login-error"
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
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="title-reset-password">
            새 비밀번호 설정
          </CardTitle>
          <p className="text-sm text-muted-foreground" data-testid="text-description">
            계정에 사용할 새로운 비밀번호를 입력해주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-password">새 비밀번호</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="8자리 이상 입력하세요"
                          className="pl-10 pr-10"
                          data-testid="input-password"
                          disabled={resetState === 'pending'}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage data-testid="error-password" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-confirm-password">비밀번호 확인</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="비밀번호를 다시 입력하세요"
                          className="pl-10 pr-10"
                          data-testid="input-confirm-password"
                          disabled={resetState === 'pending'}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage data-testid="error-confirm-password" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                data-testid="button-submit"
                disabled={resetState === 'pending'}
              >
                {resetState === 'pending' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    재설정 중...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    비밀번호 재설정
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
              disabled={resetState === 'pending'}
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