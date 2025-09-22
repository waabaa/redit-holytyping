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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { SiKakaotalk, SiGoogle, SiReplit } from "react-icons/si";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin?: () => void;
}

// 간소화된 회원가입 폼 스키마 - 필수 정보만
const signupSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(8, "비밀번호는 최소 8자리 이상이어야 합니다"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "이름을 입력해주세요").max(50, "이름은 50자를 초과할 수 없습니다"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupModal({ open, onOpenChange, onSwitchToLogin }: SignupModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { toast } = useToast();

  // 회원가입 폼
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
    },
  });

  // 회원가입 mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const response = await apiRequest("POST", "/api/auth/email/signup", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "회원가입 성공!",
        description: "이메일을 확인하여 계정을 활성화해주세요.",
      });
      
      setSignupSuccessEmail(data.email || signupForm.getValues('email'));
      signupForm.reset();
      setCurrentStep(1);
    },
    onError: (error: Error) => {
      console.error("회원가입 오류:", error);
      let errorMessage = "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
      
      // 서버에서 보낸 실제 에러 메시지 파싱
      try {
        // error.message는 "500: {json response}" 형태
        const colonIndex = error.message.indexOf(': ');
        if (colonIndex !== -1) {
          const responseText = error.message.substring(colonIndex + 2);
          const serverResponse = JSON.parse(responseText);
          
          if (serverResponse.message) {
            errorMessage = serverResponse.message;
          }
        }
      } catch (parseError) {
        // JSON 파싱 실패 시 기존 로직 사용
        if (error.message.includes("409") || error.message.includes("이미 등록된 이메일")) {
          errorMessage = "이미 등록된 이메일 주소입니다. 다른 이메일을 사용해주세요.";
        } else if (error.message.includes("400")) {
          errorMessage = "입력 데이터가 올바르지 않습니다. 다시 확인해주세요.";
        }
      }
      
      toast({
        variant: "destructive",
        title: "회원가입 실패",
        description: errorMessage,
      });
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
        description: "인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.",
      });
      setResendCooldown(180);
      setSignupSuccessEmail(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "이메일 재발송 실패",
        description: "이메일 재발송 중 오류가 발생했습니다. 다시 시도해주세요.",
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

  const handleSocialSignup = (provider: string) => {
    if (provider === '카카오') {
      window.location.href = '/auth/kakao';
    } else if (provider === 'Replit') {
      window.location.href = '/auth/replit';
    } else {
      toast({
        title: "준비 중",
        description: `${provider} 회원가입은 곧 지원될 예정입니다.`,
      });
    }
  };

  const handleEmailSignup = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  const handleEmailResend = (email: string) => {
    emailResendMutation.mutate(email);
  };

  const resetModal = () => {
    setCurrentStep(1);
    setSignupSuccessEmail(null);
    signupForm.reset();
  };

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      resetModal();
    }
  }, [open]);

  // 회원가입 성공 화면
  if (signupSuccessEmail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md w-[95%]" data-testid="dialog-signup-success">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-semibold" data-testid="text-success-title">
              회원가입 완료!
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground" data-testid="text-success-description">
              {signupSuccessEmail}로 인증 이메일을 발송했습니다.<br />
              이메일을 확인하여 계정을 활성화해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                인증 이메일이 스팸함으로 분류될 수 있으니 스팸함도 확인해주세요.
              </p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => handleEmailResend(signupSuccessEmail)}
                disabled={emailResendMutation.isPending || resendCooldown > 0}
                variant="outline"
                className="w-full"
                data-testid="button-resend-success-email"
              >
                {emailResendMutation.isPending 
                  ? "재발송 중..." 
                  : resendCooldown > 0 
                    ? `이메일 재발송 (${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, '0')})`
                    : "이메일 재발송"
                }
              </Button>
              
              <Button 
                onClick={() => onOpenChange(false)} 
                className="w-full"
                data-testid="button-close-success"
              >
                확인
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] overflow-y-auto" data-testid="dialog-signup-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold" data-testid="text-signup-modal-title">
            홀리넷에 가입하기
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground" data-testid="text-signup-modal-description">
            성경 필사와 함께하는 믿음의 여정을 시작해보세요
          </DialogDescription>
          
          {/* 진행률 표시 */}
          <div className="flex items-center space-x-2 pt-4">
            <Progress value={currentStep === 1 ? 50 : 100} className="flex-1" data-testid="progress-signup" />
            <span className="text-xs text-muted-foreground" data-testid="text-progress">{currentStep}/2</span>
          </div>
        </DialogHeader>

        {/* 1단계: 가입 방법 선택 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-center text-muted-foreground mb-4" data-testid="text-step1-title">
                가입 방법을 선택해주세요
              </h3>
              
              {/* 소셜 로그인 버튼들 - 크고 눈에 띄게 */}
              <div className="space-y-3">
                <Button
                  onClick={() => handleSocialSignup('카카오')}
                  className="w-full h-12 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black font-medium flex items-center justify-center space-x-3"
                  data-testid="button-kakao-signup"
                >
                  <SiKakaotalk className="w-5 h-5" />
                  <span>카카오로 3초 만에 가입</span>
                </Button>

                <Button
                  onClick={() => handleSocialSignup('Replit')}
                  className="w-full h-12 bg-[#F26207] hover:bg-[#F26207]/90 text-white font-medium flex items-center justify-center space-x-3"
                  data-testid="button-replit-signup"
                >
                  <SiReplit className="w-5 h-5" />
                  <span>Replit으로 가입</span>
                </Button>

                <Button
                  onClick={() => handleSocialSignup('Google')}
                  variant="outline"
                  className="w-full h-12 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium flex items-center justify-center space-x-3"
                  data-testid="button-google-signup"
                >
                  <SiGoogle className="w-5 h-5 text-[#4285f4]" />
                  <span>Google로 가입</span>
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

            {/* 이메일 가입 - 작게 배치 */}
            <Button
              onClick={() => setCurrentStep(2)}
              variant="ghost"
              className="w-full text-sm text-muted-foreground hover:text-foreground"
              data-testid="button-email-signup-option"
            >
              <Mail className="w-4 h-4 mr-2" />
              이메일로 가입하기
            </Button>
          </div>
        )}

        {/* 2단계: 이메일 가입 폼 */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="ghost"
                size="sm"
                className="p-0 h-auto"
                data-testid="button-back-to-step1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-sm font-medium text-muted-foreground" data-testid="text-step2-title">
                기본 정보를 입력해주세요
              </h3>
            </div>

            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleEmailSignup)} className="space-y-4">
                <FormField
                  control={signupForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-signup-firstname">이름 *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="이름을 입력하세요"
                            className="pl-10"
                            data-testid="input-signup-firstname"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-signup-firstname" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-signup-email">이메일 *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="이메일을 입력하세요"
                            className="pl-10"
                            data-testid="input-signup-email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-signup-email" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-signup-password">비밀번호 *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="8자리 이상 입력하세요"
                            className="pl-10 pr-10"
                            data-testid="input-signup-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-signup-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-signup-password" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-signup-confirm-password">비밀번호 확인 *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="비밀번호를 다시 입력하세요"
                            className="pl-10 pr-10"
                            data-testid="input-signup-confirm-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-signup-confirm-password"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-signup-confirm-password" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  data-testid="button-signup-submit"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending ? "가입 중..." : "회원가입 완료"}
                </Button>
              </form>
            </Form>

            <p className="text-xs text-center text-muted-foreground">
              가입을 진행하면 <span className="underline">개인정보처리방침</span>과{" "}
              <span className="underline">이용약관</span>에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        )}

        {/* 로그인 링크 - 모든 단계에서 표시 */}
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm font-medium underline"
              onClick={() => {
                onOpenChange(false);
                onSwitchToLogin?.();
              }}
              data-testid="link-switch-to-login"
            >
              로그인하기
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}