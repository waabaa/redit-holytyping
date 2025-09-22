import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed Tabs import - now login only
import { Separator } from "@/components/ui/separator";
import { SiKakaotalk, SiGoogle, SiNaver } from "react-icons/si";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// Removed insertUserSchema import - not needed for login only
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignup?: () => void;
}

// 로그인 폼 스키마 - 백엔드 API와 동일
const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

// Removed signup schema - login only modal

// Removed email resend schema - login only modal

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthModal({ open, onOpenChange, onSwitchToSignup }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  // 이메일 재발송 관련 상태 (로그인 실패 시에만)
  const [loginFailedEmail, setLoginFailedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { toast } = useToast();

  // 로그인 폼
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Removed signup form - login only modal

  // Removed signup mutation - login only modal

  // 로그인 mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/email/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "로그인 성공",
        description: data.message || "로그인이 완료되었습니다.",
      });
      loginForm.reset();
      // 사용자 정보 캐시 무효화하여 새로운 사용자 정보 가져오기
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onOpenChange(false); // 모달 닫기
      // 페이지 새로고침으로 사용자 상태 업데이트
      window.location.reload();
    },
    onError: (error: Error) => {
      console.error("로그인 오류:", error);
      console.error("로그인 오류 메시지:", error.message);
      
      let errorMessage = "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
      let isEmailNotVerified = false;
      
      // Check for specific error messages
      if (error.message.includes("이메일 또는 비밀번호가 올바르지 않거나")) {
        errorMessage = "이메일 또는 비밀번호가 올바르지 않거나, 이메일 인증이 완료되지 않았습니다.";
        isEmailNotVerified = true;
      } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
        isEmailNotVerified = true;
      } else if (error.message.includes("400")) {
        errorMessage = "입력 데이터가 올바르지 않습니다. 다시 확인해주세요.";
      }
      
      console.log("최종 오류 메시지:", errorMessage);
      
      // 이메일 미인증으로 인한 로그인 실패인 경우 재발송 옵션 제공
      if (isEmailNotVerified) {
        const currentEmail = loginForm.getValues('email');
        if (currentEmail && currentEmail.includes('@')) {
          setLoginFailedEmail(currentEmail);
        }
      }
      
      // Display toast with error message
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: errorMessage,
      });
      
      console.log("Toast 호출됨:", { title: "로그인 실패", description: errorMessage });
    },
  });

  // 이메일 재발송 mutation
  const emailResendMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/email/resend", { email });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "이메일 재발송 완료",
        description: data.message || "인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.",
      });
      
      // 재발송 쿨다운 시작 (3분)
      setResendCooldown(180);
      
      // 재발송 후 상태 초기화
      setLoginFailedEmail(null);
    },
    onError: (error: Error) => {
      console.error("이메일 재발송 오류:", error);
      let errorMessage = "이메일 재발송 중 오류가 발생했습니다. 다시 시도해주세요.";
      
      if (error.message.includes("503")) {
        errorMessage = "이메일 서비스가 일시적으로 사용할 수 없습니다. 관리자에게 문의해주세요.";
      } else if (error.message.includes("404")) {
        errorMessage = "해당 이메일로 등록된 계정을 찾을 수 없습니다.";
      } else if (error.message.includes("400") && error.message.includes("이미 인증된")) {
        errorMessage = "이미 인증된 이메일입니다. 로그인을 시도해주세요.";
      } else if (error.message.includes("429")) {
        errorMessage = "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.";
      }
      
      toast({
        variant: "destructive",
        title: "이메일 재발송 실패",
        description: errorMessage,
      });
    },
  });

  // 쿨다운 타이머 관리
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSocialLogin = (provider: string) => {
    if (provider === '카카오') {
      // 카카오 로그인 페이지로 리다이렉트
      window.location.href = '/auth/kakao';
    } else if (provider === '네이버') {
      // 네이버 로그인 페이지로 리다이렉트
      window.location.href = '/auth/naver';
    } else if (provider === 'Google') {
      // 구글 로그인 페이지로 리다이렉트
      window.location.href = '/auth/google';
    } else {
      // 다른 소셜 로그인들은 아직 구현되지 않음
      toast({
        title: "준비 중",
        description: `${provider} 로그인은 곧 지원될 예정입니다.`,
      });
    }
  };

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  // Removed handleSignup - login only modal

  const handleEmailResend = (email: string) => {
    emailResendMutation.mutate(email);
  };

  // 이메일 재발송 컴포넌트 (로그인 실패시에만)
  const EmailResendComponent = () => {
    const emailToResend = loginFailedEmail;
    const isSignupSuccess = false;
    
    if (!emailToResend) return null;

    return (
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3" data-testid="container-email-resend">
        <div className="flex items-start space-x-3">
          <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100" data-testid="text-resend-title">
              {isSignupSuccess ? "이메일 인증이 필요합니다" : "이메일 인증을 완료해주세요"}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1" data-testid="text-resend-description">
              {isSignupSuccess 
                ? `${emailToResend}로 인증 이메일을 발송했습니다. 이메일을 확인해주세요.`
                : `${emailToResend}의 이메일 인증이 필요합니다. 이메일을 확인하거나 재발송해주세요.`
              }
            </p>
            
            <div className="mt-3 flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEmailResend(emailToResend)}
                disabled={emailResendMutation.isPending || resendCooldown > 0}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900"
                data-testid="button-resend-email"
              >
                {emailResendMutation.isPending 
                  ? "재발송 중..." 
                  : resendCooldown > 0 
                    ? `재발송 (${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, '0')})`
                    : "이메일 재발송"
                }
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLoginFailedEmail(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                data-testid="button-dismiss-resend"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] overflow-y-auto" data-testid="dialog-auth-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold" data-testid="text-auth-modal-title">
            성경 필사 시작하기
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground" data-testid="text-auth-modal-description">
            로그인하고 성경 필사의 즐거움을 경험해보세요
          </DialogDescription>
        </DialogHeader>

        {/* 소셜 로그인 - 큰 버튼으로 상단에 배치 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-center text-muted-foreground mb-4" data-testid="text-social-login-title">
            간편하게 로그인하세요
          </h3>
          
          <div className="space-y-3">
            <Button
              onClick={() => handleSocialLogin('카카오')}
              className="w-full h-12 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black font-medium flex items-center justify-center space-x-3"
              data-testid="button-kakao-login"
            >
              <SiKakaotalk className="w-5 h-5" />
              <span>카카오로 3초 만에 로그인</span>
            </Button>

            <Button
              onClick={() => handleSocialLogin('네이버')}
              className="w-full h-12 bg-[#03C75A] hover:bg-[#03C75A]/90 text-white font-medium flex items-center justify-center space-x-3"
              data-testid="button-naver-login"
            >
              <SiNaver className="w-5 h-5" />
              <span>네이버로 로그인</span>
            </Button>

            <Button
              onClick={() => handleSocialLogin('Google')}
              variant="outline"
              className="w-full h-12 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium flex items-center justify-center space-x-3"
              data-testid="button-google-login"
            >
              <SiGoogle className="w-5 h-5 text-[#4285f4]" />
              <span>Google로 로그인</span>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        {/* 이메일 로그인 폼 - 하단에 작게 배치 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-center text-muted-foreground" data-testid="text-email-login-title">
            이메일로 로그인
          </h3>
          
          <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-login-email">이메일</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="이메일을 입력하세요"
                            className="pl-10"
                            data-testid="input-login-email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-login-email" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-login-password">비밀번호</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="비밀번호를 입력하세요"
                            className="pl-10 pr-10"
                            data-testid="input-login-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-login-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-login-password" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  data-testid="button-login-submit"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "로그인 중..." : "로그인"}
                </Button>
              </form>
          </Form>
          
          {/* 비밀번호 재설정 링크 */}
          <div className="text-center mt-4">
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                onOpenChange(false);
                window.location.href = '/forgot-password';
              }}
              data-testid="link-forgot-password"
            >
              비밀번호를 잊으셨나요?
            </Button>
          </div>
          
          {/* 이메일 재발송 컴포넌트 - 로그인 실패 시에만 표시 */}
          <EmailResendComponent />
        </div>
        
        {/* 회원가입 링크 */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            아직 계정이 없으신가요?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm font-medium underline"
              onClick={() => {
                onOpenChange(false);
                onSwitchToSignup?.();
              }}
              data-testid="link-switch-to-signup"
            >
              회원가입하기
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}