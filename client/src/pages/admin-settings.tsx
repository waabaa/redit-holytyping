import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Shield, 
  Smartphone,
  QrCode,
  Key,
  RefreshCw,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  EyeOff
} from "lucide-react";
import { useLocation } from "wouter";

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  message: string;
}

export default function AdminSettings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { canManageSettings } = useAdminPermissions();
  const [, navigate] = useLocation();
  const [isSetup2FAOpen, setIsSetup2FAOpen] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin access check
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !canManageSettings)) {
      navigate("/");
    }
  }, [isAuthenticated, canManageSettings, authLoading, navigate]);

  const { data: twoFactorStatus, isLoading: statusLoading } = useQuery<TwoFactorStatus>({
    queryKey: ['/api/admin/2fa/status'],
    enabled: isAuthenticated && canManageSettings,
  });

  const setup2FAMutation = useMutation({
    mutationFn: async (): Promise<TwoFactorSetup> => {
      const response = await apiRequest('POST', '/api/admin/2fa/setup');
      return response as TwoFactorSetup;
    },
    onSuccess: (data) => {
      toast({
        title: "2FA 설정 시작됨",
        description: "QR 코드를 스캔하고 인증 코드를 입력하세요.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "2FA 설정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest('POST', '/api/admin/2fa/verify', { token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/2fa/status'] });
      setIsSetup2FAOpen(false);
      setVerificationToken("");
      toast({
        title: "성공",
        description: "2FA가 성공적으로 활성화되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "2FA 인증에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/admin/2fa');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/2fa/status'] });
      toast({
        title: "성공",
        description: "2FA가 비활성화되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "2FA 비활성화에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSetup2FA = () => {
    setup2FAMutation.mutate();
  };

  const handleVerify2FA = () => {
    if (!verificationToken) {
      toast({
        title: "오류",
        description: "인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    verify2FAMutation.mutate(verificationToken);
  };

  const handleDisable2FA = () => {
    if (window.confirm("정말로 2FA를 비활성화하시겠습니까? 보안이 약해질 수 있습니다.")) {
      disable2FAMutation.mutate();
    }
  };

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "복사됨",
        description: "백업 코드가 클립보드에 복사되었습니다.",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "복사에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const downloadBackupCodes = (codes: string[]) => {
    const content = `홀리넷 성경필사 2FA 백업 코드\n생성일: ${new Date().toLocaleString('ko-KR')}\n\n${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\n※ 이 코드들을 안전한 곳에 보관하세요. 각 코드는 한 번만 사용할 수 있습니다.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `홀리넷-2FA-백업코드-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !canManageSettings) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="admin-settings">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="title-admin-settings">
          관리자 설정
        </h1>
        <p className="text-muted-foreground">
          관리자 계정의 보안 설정을 관리하세요.
        </p>
      </div>

      {/* 2FA Settings */}
      <Card className="mb-6" data-testid="card-2fa-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            이중 인증 (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">상태:</span>
                    {twoFactorStatus?.enabled ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        활성화됨
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        비활성화됨
                      </Badge>
                    )}
                  </div>
                  {twoFactorStatus?.enabled && (
                    <div className="text-sm text-muted-foreground">
                      백업 코드 {twoFactorStatus.backupCodesRemaining}개 남음
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {!twoFactorStatus?.enabled ? (
                    <Dialog open={isSetup2FAOpen} onOpenChange={setIsSetup2FAOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-setup-2fa">
                          <Smartphone className="h-4 w-4 mr-2" />
                          2FA 설정
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>이중 인증 설정</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {setup2FAMutation.data ? (
                            <>
                              {/* QR Code */}
                              <div className="text-center">
                                <div className="mb-4">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    인증 앱으로 QR 코드를 스캔하세요:
                                  </p>
                                  <div className="flex justify-center">
                                    <img 
                                      src={setup2FAMutation.data.qrCodeUrl} 
                                      alt="2FA QR Code"
                                      className="border rounded"
                                      data-testid="img-qr-code"
                                    />
                                  </div>
                                </div>
                                
                                {/* Manual Entry */}
                                <div className="mb-4">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    또는 수동으로 키를 입력하세요:
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <code className="bg-muted px-2 py-1 rounded text-sm">
                                      {setup2FAMutation.data.secret}
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(setup2FAMutation.data!.secret, 'secret')}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Verification */}
                                <div>
                                  <Label htmlFor="verification-token">인증 코드</Label>
                                  <Input
                                    id="verification-token"
                                    placeholder="6자리 인증 코드 입력"
                                    value={verificationToken}
                                    onChange={(e) => setVerificationToken(e.target.value)}
                                    maxLength={6}
                                    data-testid="input-verification-token"
                                  />
                                </div>
                                
                                {/* Backup Codes */}
                                {setup2FAMutation.data.backupCodes && (
                                  <div className="border rounded p-4 bg-muted/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-sm">백업 코드</h4>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setShowBackupCodes(!showBackupCodes)}
                                        >
                                          {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadBackupCodes(setup2FAMutation.data!.backupCodes)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      인증 앱을 분실했을 때 사용할 수 있는 일회용 코드입니다.
                                    </p>
                                    {showBackupCodes && (
                                      <div className="grid grid-cols-2 gap-2">
                                        {setup2FAMutation.data.backupCodes.map((code, index) => (
                                          <div key={index} className="flex items-center gap-2">
                                            <code className="text-xs bg-background px-2 py-1 rounded">
                                              {code}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => copyToClipboard(code, `backup-${index}`)}
                                            >
                                              {copiedCode === `backup-${index}` ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                              ) : (
                                                <Copy className="h-3 w-3" />
                                              )}
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setIsSetup2FAOpen(false)}
                                >
                                  취소
                                </Button>
                                <Button 
                                  onClick={handleVerify2FA}
                                  disabled={verify2FAMutation.isPending || !verificationToken}
                                  data-testid="button-verify-2fa"
                                >
                                  {verify2FAMutation.isPending ? "인증 중..." : "인증 완료"}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-center py-8">
                                <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground mb-4">
                                  관리자 계정의 보안을 강화하기 위해 이중 인증을 설정하세요.
                                </p>
                                <Alert>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    Google Authenticator, Authy 등의 인증 앱이 필요합니다.
                                  </AlertDescription>
                                </Alert>
                              </div>
                              
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setIsSetup2FAOpen(false)}
                                >
                                  취소
                                </Button>
                                <Button 
                                  onClick={handleSetup2FA}
                                  disabled={setup2FAMutation.isPending}
                                  data-testid="button-start-setup-2fa"
                                >
                                  {setup2FAMutation.isPending ? "설정 중..." : "설정 시작"}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button 
                      variant="destructive" 
                      onClick={handleDisable2FA}
                      disabled={disable2FAMutation.isPending}
                      data-testid="button-disable-2fa"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {disable2FAMutation.isPending ? "비활성화 중..." : "2FA 비활성화"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Warning for no 2FA */}
              {!twoFactorStatus?.enabled && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    관리자 계정에 이중 인증이 설정되어 있지 않습니다. 계정 보안을 위해 2FA를 활성화하는 것을 강력히 권장합니다.
                  </AlertDescription>
                </Alert>
              )}

              {/* Low backup codes warning */}
              {twoFactorStatus?.enabled && twoFactorStatus.backupCodesRemaining <= 3 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    백업 코드가 {twoFactorStatus.backupCodesRemaining}개 남았습니다. 새로운 백업 코드를 생성하는 것을 고려해보세요.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="mb-6" data-testid="card-security-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            보안 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Session Management */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">세션 관리</div>
                <div className="text-sm text-muted-foreground">
                  관리자 세션의 만료 시간을 설정합니다
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                현재: 30일
              </div>
            </div>

            {/* Access Logging */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">접근 로깅</div>
                <div className="text-sm text-muted-foreground">
                  모든 관리자 작업을 기록합니다
                </div>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Password Policy */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">비밀번호 정책</div>
                <div className="text-sm text-muted-foreground">
                  강력한 비밀번호 요구사항을 적용합니다
                </div>
              </div>
              <Switch checked={true} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card data-testid="card-system-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            시스템 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">관리자 ID</div>
              <div className="font-mono text-sm">{(user as any)?.id}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">이메일</div>
              <div className="text-sm">{(user as any)?.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">권한</div>
              <div className="text-sm">슈퍼 관리자</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">마지막 로그인</div>
              <div className="text-sm">{new Date().toLocaleString('ko-KR')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}