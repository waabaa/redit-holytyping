import { Resend } from 'resend';
import crypto from 'crypto';

export interface EmailVerificationData {
  email: string;
  firstName: string;
  verificationToken: string;
}

export interface PasswordResetData {
  email: string;
  firstName: string;
  resetToken: string;
}

export interface EmailServiceResult {
  success: boolean;
  error?: 'MISSING_API_KEY' | 'CONFIGURATION_ERROR' | 'SEND_FAILED' | 'UNKNOWN_ERROR';
  errorMessage?: string;
  emailId?: string;
}

/**
 * 안전한 랜덤 토큰 생성 (64바이트 hex 문자열)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * SHA-256 해시로 토큰 해시화 (보안 강화)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * 이메일 인증을 위한 한국어 HTML 템플릿
 */
function createEmailVerificationTemplate(data: EmailVerificationData): string {
  // Replit 환경에서는 REPLIT_DOMAINS를 사용, 그 외에는 FRONTEND_URL 또는 localhost
  const replitDomain = process.env.REPLIT_DOMAINS;
  const baseUrl = process.env.FRONTEND_URL || 
                  (replitDomain ? `https://${replitDomain}` : 'http://localhost:5000');
  
  const verificationUrl = `${baseUrl}/verify-email?token=${data.verificationToken}`;
  
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>이메일 인증</title>
        <style>
            body {
                font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
            }
            .title {
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #1a1a1a;
            }
            .content {
                margin-bottom: 30px;
                line-height: 1.8;
            }
            .button {
                display: inline-block;
                background-color: #2563eb;
                color: white !important;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #1d4ed8;
            }
            .info-box {
                background-color: #f8f9fa;
                border-left: 4px solid #2563eb;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📖 성경 타이핑 연습</div>
            </div>
            
            <div class="title">
                안녕하세요, ${data.firstName || '사용자'}님! 👋
            </div>
            
            <div class="content">
                <p>성경 타이핑 연습 서비스에 회원가입해 주셔서 감사합니다.</p>
                <p>아래 버튼을 클릭하여 이메일 주소를 인증해 주세요.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                    이메일 인증하기 ✅
                </a>
            </div>
            
            <div class="info-box">
                <strong>📋 인증 안내:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>이메일 인증은 <strong>24시간</strong> 후 만료됩니다</li>
                    <li>인증 완료 후 모든 서비스를 이용하실 수 있습니다</li>
                    <li>성경 말씀으로 타이핑 실력을 향상시켜보세요</li>
                </ul>
            </div>
            
            <div class="warning">
                <strong>⚠️ 주의사항:</strong><br>
                링크가 작동하지 않는 경우, 아래 주소를 복사해서 브라우저 주소창에 붙여넣어 주세요:<br>
                <code style="word-break: break-all; background: #fff; padding: 5px; border-radius: 3px; font-size: 12px;">${verificationUrl}</code>
            </div>
            
            <div class="footer">
                <p>본 이메일은 발신 전용입니다. 문의사항이 있으시면 고객센터를 이용해 주세요.</p>
                <p style="color: #999;">© 2024 성경 타이핑 연습 서비스. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * 비밀번호 리셋을 위한 한국어 HTML 템플릿
 */
function createPasswordResetTemplate(data: PasswordResetData): string {
  // Replit 환경에서는 REPLIT_DOMAINS를 사용, 그 외에는 FRONTEND_URL 또는 localhost
  const replitDomain = process.env.REPLIT_DOMAINS;
  const baseUrl = process.env.FRONTEND_URL || 
                  (replitDomain ? `https://${replitDomain}` : 'http://localhost:5000');
  
  const resetUrl = `${baseUrl}/reset-password?token=${data.resetToken}`;
  
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>비밀번호 재설정</title>
        <style>
            body {
                font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 10px;
            }
            .title {
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #1a1a1a;
            }
            .content {
                margin-bottom: 30px;
                line-height: 1.8;
            }
            .button {
                display: inline-block;
                background-color: #dc2626;
                color: white !important;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #b91c1c;
            }
            .info-box {
                background-color: #fef2f2;
                border-left: 4px solid #dc2626;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📖 홀리넷 성경필사</div>
                <h1 class="title">비밀번호 재설정</h1>
            </div>
            
            <div class="content">
                <p><strong>${data.firstName}님</strong>, 안녕하세요!</p>
                <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">
                    비밀번호 재설정하기 🔒
                </a>
            </div>
            
            <div class="info-box">
                <strong>🔐 보안 안내:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>이 링크는 <strong>1시간</strong> 후 자동으로 만료됩니다</li>
                    <li>요청하지 않은 경우 이 이메일을 무시하세요</li>
                    <li>새 비밀번호는 안전하게 설정해 주세요</li>
                </ul>
            </div>
            
            <div class="warning">
                <strong>⚠️ 주의사항:</strong><br>
                링크가 작동하지 않는 경우, 아래 주소를 복사해서 브라우저 주소창에 붙여넣어 주세요:<br>
                <code style="word-break: break-all; background: #fff; padding: 5px; border-radius: 3px; font-size: 12px;">${resetUrl}</code>
            </div>
            
            <div class="footer">
                <p>본 이메일은 발신 전용입니다. 문의사항이 있으시면 고객센터를 이용해 주세요.</p>
                <p style="color: #999;">© 2024 성경 타이핑 연습 서비스. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * 이메일 인증 메일 발송 - 견고성 강화 버전
 * API 키 검증을 내부에서 수행하고 타입된 오류를 반환
 */
export async function sendEmailVerification(data: EmailVerificationData): Promise<EmailServiceResult> {
  // STEP 1: API 키 검증
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY environment variable is missing');
    return {
      success: false,
      error: 'MISSING_API_KEY',
      errorMessage: 'Email service is not configured. Please contact support.',
    };
  }

  // STEP 2: Resend 클라이언트 초기화 (API 키가 있을 때만)
  let resend: Resend;
  try {
    resend = new Resend(apiKey);
  } catch (error) {
    console.error('❌ Resend 클라이언트 초기화 실패:', error);
    return {
      success: false,
      error: 'CONFIGURATION_ERROR',
      errorMessage: 'Email service configuration error. Please contact support.',
    };
  }

  // STEP 3: 이메일 발송 시도
  try {
    console.log(`🔄 이메일 발송 시도 중: ${data.email} → onboarding@resend.dev`);
    console.log(`📧 API Key 존재 여부: ${apiKey ? '✅ 있음' : '❌ 없음'}`);
    console.log(`📧 API Key 길이: ${apiKey ? apiKey.length : 0}자`);
    
    // 개발 환경에서는 Resend 테스트 제한으로 인해 허용된 이메일로만 발송
    const isDevelopment = process.env.NODE_ENV === 'development';
    const testEmail = 'leejungchul@gmail.com'; // Resend에서 허용된 테스트 이메일
    
    const emailPayload = {
      from: 'onboarding@resend.dev',
      to: isDevelopment ? [testEmail] : [data.email],
      subject: '📖 성경 타이핑 연습 - 이메일 인증을 완료해 주세요',
      html: createEmailVerificationTemplate({
        ...data,
        email: isDevelopment ? testEmail : data.email // 템플릿에도 실제 수신자 표시
      }),
    };
    
    if (isDevelopment) {
      console.log(`🔧 개발 환경: ${data.email} → ${testEmail}로 이메일 발송 리다이렉트`);
    }
    
    console.log(`📧 발송 데이터:`, {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length
    });
    
    const result = await resend.emails.send(emailPayload);
    
    console.log(`📧 Resend API 응답:`, result);

    if (result.error) {
      console.error('❌ 이메일 발송 실패 (result.error):', result.error);
      console.error('❌ 오류 상세:', JSON.stringify(result.error, null, 2));
      return {
        success: false,
        error: 'SEND_FAILED',
        errorMessage: `Failed to send email: ${result.error.message || 'Unknown error'}`,
      };
    }

    console.log(`✅ 이메일 인증 메일 발송 성공: ${data.email} (ID: ${result.data?.id})`);
    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    console.error('❌ 이메일 발송 중 예외 발생:', error);
    console.error('❌ 예외 상세:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      errorMessage: `Unexpected error during email sending: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * 토큰 만료시간 계산 (24시간 후)
 */
export function getTokenExpirationTime(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24);
  return expiration;
}

/**
 * 토큰이 만료되었는지 확인
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * 비밀번호 리셋 메일 발송
 */
export async function sendPasswordReset(data: PasswordResetData): Promise<EmailServiceResult> {
  // STEP 1: API 키 검증
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY environment variable is missing');
    return {
      success: false,
      error: 'MISSING_API_KEY',
      errorMessage: 'Email service is not configured. Please contact support.',
    };
  }

  // STEP 2: Resend 클라이언트 초기화 (API 키가 있을 때만)
  let resend: Resend;
  try {
    resend = new Resend(apiKey);
  } catch (error) {
    console.error('❌ Resend 클라이언트 초기화 실패:', error);
    return {
      success: false,
      error: 'CONFIGURATION_ERROR',
      errorMessage: 'Email service configuration error. Please contact support.',
    };
  }

  // STEP 3: 이메일 발송 시도
  try {
    console.log(`🔄 비밀번호 리셋 이메일 발송 시도 중: ${data.email} → onboarding@resend.dev`);
    console.log(`📧 API Key 존재 여부: ${apiKey ? '✅ 있음' : '❌ 없음'}`);
    console.log(`📧 API Key 길이: ${apiKey ? apiKey.length : 0}자`);
    
    // 개발 환경에서는 Resend 테스트 제한으로 인해 허용된 이메일로만 발송
    const isDevelopment = process.env.NODE_ENV === 'development';
    const testEmail = 'leejungchul@gmail.com'; // Resend에서 허용된 테스트 이메일
    
    const emailPayload = {
      from: 'onboarding@resend.dev',
      to: isDevelopment ? [testEmail] : [data.email],
      subject: '🔒 성경 타이핑 연습 - 비밀번호 재설정 요청',
      html: createPasswordResetTemplate({
        ...data,
        email: isDevelopment ? testEmail : data.email // 템플릿에도 실제 수신자 표시
      }),
    };
    
    if (isDevelopment) {
      console.log(`🔧 개발 환경: ${data.email} → ${testEmail}로 이메일 발송 리다이렉트`);
    }
    
    console.log(`📧 발송 데이터:`, {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length
    });
    
    const result = await resend.emails.send(emailPayload);
    
    console.log(`📧 Resend API 응답:`, result);

    if (result.error) {
      console.error('❌ 비밀번호 리셋 이메일 발송 실패 (result.error):', result.error);
      console.error('❌ 오류 상세:', JSON.stringify(result.error, null, 2));
      return {
        success: false,
        error: 'SEND_FAILED',
        errorMessage: `Failed to send password reset email: ${result.error.message || 'Unknown error'}`,
      };
    }

    console.log(`✅ 비밀번호 리셋 메일 발송 성공: ${data.email} (ID: ${result.data?.id})`);
    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    console.error('❌ 비밀번호 리셋 이메일 발송 중 예외 발생:', error);
    console.error('❌ 예외 상세:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      errorMessage: `Unexpected error during password reset email sending: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * 비밀번호 리셋 토큰 만료시간 계산 (1시간 후)
 */
export function getPasswordResetTokenExpirationTime(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 1); // 1시간 후 만료 (보안상 짧게)
  return expiration;
}