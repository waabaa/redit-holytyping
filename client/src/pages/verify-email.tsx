import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type VerificationState = 'pending' | 'verifying' | 'success' | 'error' | 'expired' | 'already-verified' | 'invalid-token';

interface VerificationResponse {
  message: string;
  email?: string;
}

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [verificationState, setVerificationState] = useState<VerificationState>('pending');
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Extract token from URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verificationToken = urlParams.get('token');
    
    if (!verificationToken) {
      setVerificationState('invalid-token');
      setErrorMessage('인증 토큰이 없습니다. 이메일에서 올바른 링크를 클릭해주세요.');
      return;
    }
    
    setToken(verificationToken);
    // Auto-verify when component mounts
    verifyEmailMutation.mutate({ token: verificationToken });
  }, []);

  // Email verification mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      setVerificationState('verifying');
      const response = await apiRequest('POST', '/api/auth/email/verify', { token });
      return response.json();
    },
    onSuccess: (data: VerificationResponse) => {
      setVerificationState('success');
      setEmail(data.email || '');
      
      toast({
        title: "이메일 인증 완료! ✅",
        description: "계정이 성공적으로 활성화되었습니다.",
        duration: 5000,
      });

      // Redirect to login/dashboard after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    },
    onError: (error: Error) => {
      console.error('Email verification error:', error);
      
      // Parse error message to determine specific error type
      const errorMsg = error.message;
      
      if (errorMsg.includes('유효하지 않은 인증 토큰')) {
        setVerificationState('invalid-token');
        setErrorMessage('유효하지 않은 인증 토큰입니다.');
      } else if (errorMsg.includes('이미 사용된 인증 토큰') || errorMsg.includes('이미 인증된 이메일')) {
        setVerificationState('already-verified');
        setErrorMessage('이미 인증된 계정입니다.');
      } else if (errorMsg.includes('만료된') || errorMsg.includes('만료되었습니다')) {
        setVerificationState('expired');
        setErrorMessage('인증 토큰이 만료되었습니다.');
      } else {
        setVerificationState('error');
        setErrorMessage('인증 처리 중 오류가 발생했습니다.');
      }
    },
  });

  // Resend verification email mutation
  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error('이메일 주소가 필요합니다.');
      }
      const response = await apiRequest('POST', '/api/auth/email/resend', { email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "인증 이메일 재발송 완료",
        description: "새로운 인증 링크가 이메일로 발송되었습니다.",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "재발송 실패",
        description: error.message || "이메일 재발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const renderVerificationContent = () => {
    switch (verificationState) {
      case 'pending':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">인증 토큰을 확인하는 중...</p>
          </div>
        );

      case 'verifying':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">이메일 인증 중입니다</h3>
              <p className="text-muted-foreground">잠시만 기다려주세요...</p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-green-600">인증 완료!</h3>
              <p className="text-muted-foreground">
                {email && `${email} 계정이 성공적으로 활성화되었습니다.`}
              </p>
              <p className="text-sm text-muted-foreground">
                3초 후 메인 페이지로 이동합니다...
              </p>
            </div>
            <Button 
              onClick={() => navigate('/')}
              data-testid="button-go-home"
              className="mt-4"
            >
              지금 시작하기
            </Button>
          </div>
        );

      case 'already-verified':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-blue-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-blue-600">이미 인증된 계정</h3>
              <p className="text-muted-foreground">
                해당 계정은 이미 인증이 완료되었습니다.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/')}
              data-testid="button-go-login"
              className="mt-4"
            >
              로그인하기
            </Button>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-amber-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-amber-600">인증 링크 만료</h3>
              <p className="text-muted-foreground">
                인증 링크가 만료되었습니다. 새로운 인증 이메일을 요청해주세요.
              </p>
            </div>
            <Alert className="text-left">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                이메일 주소를 입력하고 재발송 버튼을 클릭하세요.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email-resend"
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button 
                onClick={() => resendEmailMutation.mutate()}
                disabled={!email || resendEmailMutation.isPending}
                data-testid="button-resend-email"
                className="w-full"
              >
                {resendEmailMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    재발송 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    인증 이메일 재발송
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'invalid-token':
        return (
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-red-600">유효하지 않은 링크</h3>
              <p className="text-muted-foreground">
                {errorMessage || '인증 링크가 올바르지 않습니다.'}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/')}
              data-testid="button-back-home"
              variant="outline"
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              메인으로 돌아가기
            </Button>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-red-600">인증 실패</h3>
              <p className="text-muted-foreground">
                {errorMessage || '인증 처리 중 오류가 발생했습니다.'}
              </p>
            </div>
            <div className="space-x-2">
              <Button 
                onClick={() => verifyEmailMutation.mutate({ token })}
                disabled={verifyEmailMutation.isPending}
                data-testid="button-retry-verification"
                variant="outline"
              >
                {verifyEmailMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    재시도 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    다시 시도
                  </>
                )}
              </Button>
              <Button 
                onClick={() => navigate('/')}
                data-testid="button-back-main"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                메인으로
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-page-title">
            이메일 인증
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderVerificationContent()}
        </CardContent>
      </Card>
    </div>
  );
}