import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { setupAuth, isAuthenticated } from "./replitAuth"; // Removed Replit auth
import { setupKoreanOAuth, isKoreanOAuthAuthenticated } from "./koreanOAuth";
import { insertTypingSessionSchema, insertChurchSchema, insertChallengeParticipationSchema, insertAdminRoleSchema, type AdminPermission, type AdminRoleType } from "@shared/schema";
import { z } from "zod";
import { cache, TTL } from "./cache";
import { authRateLimiter, verifyRateLimiter } from "./rateLimiter";
import "./types"; // Import session type augmentation

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - Removed Replit OAuth
  // await setupAuth(app);
  
  // Korean OAuth setup
  setupKoreanOAuth(app);

  // Unified authentication middleware for session-based auth only
  const isAuthenticatedUnified = (req: any, res: any, next: any) => {
    // Check for session user (OAuth or email)
    const sessionUser = req.session?.user;
    if (sessionUser && sessionUser.id) {
      // Set up req.user for downstream handlers
      req.user = {
        claims: { sub: sessionUser.id },
        ...sessionUser,
      };
      return next();
    }
    
    // No valid session found
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Admin authentication middleware
  const isAdminAuthenticated = async (req: any, res: any, next: any) => {
    // First check if user is authenticated
    isAuthenticatedUnified(req, res, async () => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (!user || !user.isAdmin) {
          return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }
        
        next();
      } catch (error) {
        console.error("Error checking admin status:", error);
        res.status(500).json({ message: "Failed to verify admin status" });
      }
    });
  };
  
  // Enhanced admin permission middleware
  const requireAdminPermission = (permission: AdminPermission) => {
    return async (req: any, res: any, next: any) => {
      isAuthenticatedUnified(req, res, async () => {
        try {
          const userId = req.user.claims.sub;
          const hasPermission = await storage.checkAdminPermission(userId, permission);
          
          if (!hasPermission) {
            // Log access attempt
            await storage.logAdminAccess({
              userId,
              action: `attempt_${permission}`,
              resource: req.path,
              method: req.method,
              url: req.originalUrl,
              userAgent: req.get('User-Agent') || '',
              ipAddress: req.ip,
              success: false,
              errorMessage: 'Insufficient permissions',
              responseStatus: 403,
            });
            
            return res.status(403).json({ message: "Access denied. Insufficient permissions." });
          }
          
          next();
        } catch (error) {
          console.error("Error checking admin permission:", error);
          res.status(500).json({ message: "Failed to verify admin permission" });
        }
      });
    };
  };
  
  // Enhanced admin role middleware
  const requireAdminRole = (role: AdminRoleType) => {
    return async (req: any, res: any, next: any) => {
      isAuthenticatedUnified(req, res, async () => {
        try {
          const userId = req.user.claims.sub;
          const hasRole = await storage.checkAdminRole(userId, role);
          
          if (!hasRole) {
            // Log access attempt
            await storage.logAdminAccess({
              userId,
              action: `attempt_role_${role}`,
              resource: req.path,
              method: req.method,
              url: req.originalUrl,
              userAgent: req.get('User-Agent') || '',
              ipAddress: req.ip,
              success: false,
              errorMessage: 'Insufficient role',
              responseStatus: 403,
            });
            
            return res.status(403).json({ message: "Access denied. Insufficient role." });
          }
          
          next();
        } catch (error) {
          console.error("Error checking admin role:", error);
          res.status(500).json({ message: "Failed to verify admin role" });
        }
      });
    };
  };
  
  // Sensitive fields that should never be logged
  const SENSITIVE_FIELDS = [
    'password', 'newPassword', 'currentPassword', 'confirmPassword',
    'token', 'verificationToken', 'resetToken', 'accessToken', 'refreshToken',
    'secret', 'totpSecret', 'qrCodeUrl', 'backupCodes', 'backupCode',
    'otp', 'totp', 'code', 'verificationCode', 'authCode',
    'authorization', 'session', 'sessionId', 'cookies',
    'clientSecret', 'apiKey', 'privateKey', 'certificate'
  ];

  // Function to sanitize request data by removing sensitive fields
  const sanitizeRequestData = (data: any, path: string): any => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // For 2FA endpoints, don't log request body at all
    if (path.includes('/2fa/')) {
      return { _note: 'Request data redacted for security (2FA endpoint)' };
    }

    // For other sensitive endpoints, redact selectively
    if (Array.isArray(data)) {
      return data.map((item, index) => sanitizeRequestData(item, `${path}[${index}]`));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains any sensitive field names
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeRequestData(value, `${path}.${key}`);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  };

  // Admin access logging middleware
  const logAdminAction = (action: string) => {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      // Store original end function
      const originalEnd = res.end;
      
      // Override end function to log when response is sent
      res.end = function(chunk: any, encoding: any) {
        res.end = originalEnd;
        
        // Log the admin action
        const duration = Date.now() - startTime;
        const userId = req.user?.claims?.sub;
        
        if (userId) {
          // Sanitize request data before logging
          let requestData = undefined;
          if (req.method === 'POST' || req.method === 'PUT') {
            requestData = sanitizeRequestData(req.body, req.path);
          }

          storage.logAdminAccess({
            userId,
            action,
            resource: req.path,
            method: req.method,
            url: req.originalUrl,
            userAgent: req.get('User-Agent') || '',
            ipAddress: req.ip,
            success: res.statusCode < 400,
            errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
            requestData,
            responseStatus: res.statusCode,
            duration,
          }).catch(error => console.error('Failed to log admin access:', error));
        }
        
        res.end.call(this, chunk, encoding);
      };
      
      next();
    };
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email authentication routes
  // Email signup schema
  const emailSignupSchema = z.object({
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
    password: z.string().min(8, "비밀번호는 최소 8자리 이상이어야 합니다"),
    firstName: z.string().min(1, "이름을 입력해주세요").max(50, "이름은 50자를 초과할 수 없습니다"),
  });

  // Email login schema
  const emailLoginSchema = z.object({
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
    password: z.string().min(1, "비밀번호를 입력해주세요"),
  });

  app.post('/api/auth/email/signup', authRateLimiter.middleware(), async (req, res) => {
    try {
      const validatedData = emailSignupSchema.parse(req.body);
      const { email, password, firstName } = validatedData;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "이미 등록된 이메일 주소입니다. 다른 이메일을 사용해주세요." 
        });
      }

      // Hash password
      const bcrypt = await import('bcrypt');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user (not verified yet)
      const user = await storage.createEmailUser(email, hashedPassword, firstName);

      // Generate verification token
      const { generateSecureToken, hashToken, getTokenExpirationTime, sendEmailVerification } = await import('./emailService');
      const verificationToken = generateSecureToken();
      const hashedToken = hashToken(verificationToken); // 보안을 위해 해시화
      const expiresAt = getTokenExpirationTime();

      // Save hashed token to database
      await storage.createVerificationToken(email, hashedToken, expiresAt);

      // Send verification email with enhanced error handling
      const emailResult = await sendEmailVerification({
        email,
        firstName,
        verificationToken,
      });

      if (!emailResult.success) {
        console.error(`이메일 발송 실패: ${email}`, emailResult);
        
        // Handle different types of email service errors
        if (emailResult.error === 'MISSING_API_KEY' || emailResult.error === 'CONFIGURATION_ERROR') {
          return res.status(503).json({ 
            message: "이메일 서비스가 일시적으로 사용할 수 없습니다. 관리자에게 문의해주세요.",
            supportMessage: "Email service is currently unavailable. Please contact support."
          });
        }
        
        // For send failures or other errors, return 500 with retry suggestion
        return res.status(500).json({ 
          message: "계정이 생성되었지만 인증 이메일 발송에 실패했습니다. 잠시 후 이메일 재발송을 시도해주세요.",
          canRetry: true
        });
      }

      console.log(`✅ 회원가입 성공: ${email} - 인증 이메일 발송됨`);

      res.status(201).json({
        message: "회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.",
        email: user.email,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          emailVerified: user.emailVerified,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "입력 데이터가 올바르지 않습니다.", 
          errors: error.errors 
        });
      }
      console.error("Email signup error:", error);
      res.status(500).json({ message: "회원가입 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  });

  app.post('/api/auth/email/verify', verifyRateLimiter.middleware(), async (req, res) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "인증 토큰이 필요합니다." });
      }

      // Hash the provided token to compare with stored hash
      const { hashToken } = await import('./emailService');
      const hashedToken = hashToken(token);
      
      // Get token from database using hashed version
      const tokenRecord = await storage.getVerificationToken(hashedToken);
      
      if (!tokenRecord) {
        // SECURITY: Don't reveal token existence - return generic error
        console.log(`⚠️ 이메일 인증 실패 - 존재하지 않는 토큰: ${token.substring(0, 8)}...`);
        return res.status(400).json({ message: "인증 토큰이 유효하지 않거나 만료되었습니다." });
      }

      if (tokenRecord.isUsed) {
        return res.status(400).json({ message: "이미 사용된 인증 토큰입니다." });
      }

      // Check if token expired
      const { isTokenExpired } = await import('./emailService');
      if (isTokenExpired(tokenRecord.expiresAt)) {
        return res.status(400).json({ message: "인증 토큰이 만료되었습니다. 새로운 인증 메일을 요청해주세요." });
      }

      // SECURITY: Additional verification - ensure user exists and is not already verified
      const user = await storage.getUserByEmail(tokenRecord.email);
      if (!user) {
        // SECURITY: Don't reveal user existence - return generic error and log internally
        console.error(`⚠️ 이메일 인증 실패 - 토큰은 존재하지만 사용자 없음: ${tokenRecord.email}`);
        return res.status(400).json({ message: "인증 토큰이 유효하지 않거나 만료되었습니다." });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "이미 인증된 이메일입니다." });
      }

      // Activate user email
      await storage.activateUserEmail(tokenRecord.email);

      // Mark token as used (using hashed version)
      await storage.markTokenAsUsed(hashedToken);

      // Clean up expired tokens
      await storage.cleanupExpiredTokens();

      console.log(`✅ 이메일 인증 완료: ${tokenRecord.email}`);

      res.json({ 
        message: "이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.",
        email: tokenRecord.email,
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "이메일 인증 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  });

  // Email resend verification schema
  const emailResendSchema = z.object({
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  });

  app.post('/api/auth/email/resend', verifyRateLimiter.middleware(), async (req, res) => {
    try {
      const validatedData = emailResendSchema.parse(req.body);
      const { email } = validatedData;

      // SECURITY: Check if user exists and is not already verified
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // SECURITY FIX: Don't reveal user existence - always return 200 with generic success message
        // Internal log for debugging purposes only
        console.log(`⚠️ 이메일 재발송 시도 - 존재하지 않는 사용자: ${email}`);
        return res.status(200).json({ 
          message: "인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.",
          email: email,
          // Don't indicate whether email exists or not
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ 
          message: "이미 인증된 이메일입니다. 로그인을 시도해주세요." 
        });
      }

      // Generate new verification token (this automatically invalidates previous tokens)
      const { generateSecureToken, hashToken, getTokenExpirationTime, sendEmailVerification } = await import('./emailService');
      const verificationToken = generateSecureToken();
      const hashedToken = hashToken(verificationToken);
      const expiresAt = getTokenExpirationTime();

      // Save new hashed token to database (automatically rotates/deletes old tokens)
      await storage.createVerificationToken(email, hashedToken, expiresAt);

      // Send verification email with enhanced error handling
      const emailResult = await sendEmailVerification({
        email,
        firstName: user.firstName || '사용자',
        verificationToken,
      });

      if (!emailResult.success) {
        console.error(`이메일 재발송 실패: ${email}`, emailResult);
        
        // Handle different types of email service errors
        if (emailResult.error === 'MISSING_API_KEY' || emailResult.error === 'CONFIGURATION_ERROR') {
          return res.status(503).json({ 
            message: "이메일 서비스가 일시적으로 사용할 수 없습니다. 관리자에게 문의해주세요.",
            supportMessage: "Email service is currently unavailable. Please contact support."
          });
        }
        
        // For send failures or other errors, return 500 with retry suggestion
        return res.status(500).json({ 
          message: "인증 이메일 재발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
          canRetry: true
        });
      }

      console.log(`✅ 이메일 인증 재발송 성공: ${email} - 기존 토큰 무효화됨`);

      res.json({
        message: "인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.",
        email: email,
        tokenRotated: true, // Indicate that previous tokens are now invalid
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "올바른 이메일 주소를 입력해주세요.", 
          errors: error.errors 
        });
      }
      console.error("Email resend error:", error);
      res.status(500).json({ message: "이메일 재발송 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  });

  app.post('/api/auth/email/login', authRateLimiter.middleware(), async (req, res) => {
    try {
      const validatedData = emailLoginSchema.parse(req.body);
      const { email, password } = validatedData;

      // Verify user credentials
      const user = await storage.verifyUserPassword(email, password);
      
      if (!user) {
        return res.status(401).json({ 
          message: "이메일 또는 비밀번호가 올바르지 않거나, 이메일 인증이 완료되지 않았습니다." 
        });
      }

      // SECURITY: Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration failed:", err);
          return res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
        }

        // Set up session (similar to OAuth login)
        req.session.user = {
          id: user.id,
          email: user.email || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          profileImageUrl: user.profileImageUrl || undefined,
          authProvider: 'email',
        };

        // Save session to ensure it's persisted
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save failed:", saveErr);
            return res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
          }

          console.log(`✅ 이메일 로그인 성공: ${email}`);

          res.json({
            message: "로그인이 완료되었습니다.",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
              emailVerified: user.emailVerified,
              authProvider: user.authProvider,
            },
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "입력 데이터가 올바르지 않습니다.", 
          errors: error.errors 
        });
      }
      console.error("Email login error:", error);
      res.status(500).json({ message: "로그인 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  });

  // Password reset request schema
  const forgotPasswordSchema = z.object({
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  });

  // Password reset request route
  app.post('/api/auth/forgot-password', authRateLimiter.middleware(), async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const { email } = validatedData;

      // SECURITY: Always return 200 regardless of whether user exists
      // This prevents email enumeration attacks
      let userExists = false;
      let firstName = '사용자';
      
      const user = await storage.getUserByEmail(email);
      if (user && user.emailVerified) {
        userExists = true;
        firstName = user.firstName || '사용자';
      }

      // Always return success message to prevent email enumeration
      if (!userExists) {
        console.log(`⚠️ 비밀번호 리셋 요청 - 존재하지 않거나 미인증 사용자: ${email}`);
        return res.status(200).json({ 
          message: "비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.",
          email: email,
        });
      }

      // Generate reset token
      const { generateSecureToken, getPasswordResetTokenExpirationTime, sendPasswordReset } = await import('./emailService');
      const resetToken = generateSecureToken();
      const expiresAt = getPasswordResetTokenExpirationTime();

      // Save reset token to database
      await storage.createPasswordResetToken(email, resetToken, expiresAt);

      // Send password reset email
      const emailResult = await sendPasswordReset({
        email,
        firstName,
        resetToken,
      });

      // SECURITY: Always return success message even if email sending fails
      // This prevents email enumeration attacks
      if (!emailResult.success) {
        console.error(`비밀번호 리셋 이메일 발송 실패: ${email}`, emailResult);
        // Log error internally but don't expose to user
      }

      console.log(`✅ 비밀번호 리셋 이메일 발송 성공: ${email}`);

      res.json({ 
        message: "비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.",
        email: email,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "입력 데이터가 올바르지 않습니다.", 
          errors: error.errors 
        });
      }
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "비밀번호 재설정 요청 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  });

  // Password reset execution schema
  const resetPasswordSchema = z.object({
    token: z.string().min(1, "재설정 토큰이 필요합니다"),
    password: z.string().min(8, "비밀번호는 최소 8자리 이상이어야 합니다"),
  });

  // Password reset execution route
  app.post('/api/auth/reset-password', authRateLimiter.middleware(), async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const { token, password } = validatedData;

      // Get and validate reset token
      const tokenRecord = await storage.getPasswordResetToken(token);
      
      if (!tokenRecord) {
        console.log(`⚠️ 비밀번호 리셋 실패 - 존재하지 않는 토큰: ${token.substring(0, 8)}...`);
        return res.status(400).json({ message: "재설정 토큰이 유효하지 않거나 만료되었습니다." });
      }

      if (tokenRecord.isUsed) {
        return res.status(400).json({ message: "이미 사용된 재설정 토큰입니다." });
      }

      // Check if token expired
      const { isTokenExpired } = await import('./emailService');
      if (isTokenExpired(tokenRecord.expiresAt)) {
        return res.status(400).json({ message: "재설정 토큰이 만료되었습니다. 새로운 비밀번호 재설정을 요청해주세요." });
      }

      // Verify user exists and is verified
      const user = await storage.getUserByEmail(tokenRecord.email);
      if (!user || !user.emailVerified) {
        console.error(`⚠️ 비밀번호 리셋 실패 - 토큰은 존재하지만 사용자 없음 또는 미인증: ${tokenRecord.email}`);
        return res.status(400).json({ message: "재설정 토큰이 유효하지 않거나 만료되었습니다." });
      }

      // Hash new password
      const bcrypt = await import('bcrypt');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user password
      await storage.updateUserPassword(tokenRecord.email, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);

      // Clean up expired tokens
      await storage.cleanupExpiredPasswordResetTokens();

      console.log(`✅ 비밀번호 리셋 완료: ${tokenRecord.email}`);

      res.json({ 
        message: "비밀번호가 성공적으로 재설정되었습니다. 새로운 비밀번호로 로그인해주세요.",
        email: tokenRecord.email,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "입력 데이터가 올바르지 않습니다.", 
          errors: error.errors 
        });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ message: "비밀번호 재설정 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  });

  // Dashboard routes
  app.get('/api/user/dashboard', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboardData = await storage.getUserDashboard(userId);
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching user dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get('/api/user/recent-sessions', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const recentSessions = await storage.getUserRecentSessions(userId, limit);
      res.json(recentSessions);
    } catch (error) {
      console.error("Error fetching recent sessions:", error);
      res.status(500).json({ message: "Failed to fetch recent sessions" });
    }
  });

  app.get('/api/user/progress', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressData = await storage.getUserProgress(userId);
      res.json(progressData);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });

  app.get('/api/user/achievements', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  // User profile update route
  app.patch('/api/users/profile', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, age, region, churchId } = req.body;
      
      // Validate input data
      const profileData: { firstName?: string; age?: number; region?: string; churchId?: string | null; profileCompleted?: boolean } = {};
      
      if (firstName !== undefined) {
        if (typeof firstName !== 'string' || firstName.trim().length === 0) {
          return res.status(400).json({ message: "FirstName is required and must be a non-empty string" });
        }
        if (firstName.length > 100) {
          return res.status(400).json({ message: "FirstName must not exceed 100 characters" });
        }
        profileData.firstName = firstName.trim();
      }
      
      if (age !== undefined) {
        if (typeof age !== 'number' || age < 10 || age > 100) {
          return res.status(400).json({ message: "Age must be a number between 10 and 100" });
        }
        profileData.age = age;
      }
      
      if (region !== undefined) {
        if (typeof region !== 'string' || region.length > 100) {
          return res.status(400).json({ message: "Region must be a string with maximum 100 characters" });
        }
        profileData.region = region;
      }
      
      if (churchId !== undefined) {
        if (churchId !== null && typeof churchId !== 'string') {
          return res.status(400).json({ message: "ChurchId must be a string or null" });
        }
        
        // Handle explicit church removal (null or empty string)
        if (churchId === null || churchId === '') {
          profileData.churchId = null;
        } else if (churchId) {
          // Verify church exists if a valid churchId is provided
          const church = await storage.getChurch(churchId);
          if (!church) {
            return res.status(404).json({ message: "Church not found" });
          }
          profileData.churchId = churchId;
        }
      }

      // Mark profile as completed when user interacts with profile completion
      // This includes both updating fields and explicitly skipping profile completion
      profileData.profileCompleted = true;
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Temporary admin route for OAuth preparation - backfill existing users
  app.post('/api/admin/backfill-replit-auth', requireAdminPermission('admin.manage'), logAdminAction('backfill_replit_auth'), async (req: any, res) => {
    try {
      console.log('🔄 Starting Replit auth info backfill...');
      const result = await storage.backfillReplitAuthInfo();
      console.log(`✅ Backfill completed: ${result.updatedCount} users updated`);
      
      if (result.errors.length > 0) {
        console.warn('⚠️ Backfill had errors:', result.errors);
      }
      
      res.json({
        success: true,
        message: `Successfully backfilled ${result.updatedCount} users`,
        updatedCount: result.updatedCount,
        errors: result.errors,
      });
    } catch (error) {
      console.error('❌ Backfill failed:', error);
      res.status(500).json({
        success: false,
        message: 'Backfill failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Admin dashboard routes - require admin authentication
  app.get('/api/admin/stats', requireAdminPermission('stats.view'), logAdminAction('view_stats'), async (req: any, res) => {
    try {
      // Cache admin stats for 5 minutes to improve performance
      const stats = await cache.getOrSet(
        'admin-stats',
        () => storage.getAdminStats(),
        5 * 60 * 1000 // 5 minutes TTL
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  app.post('/api/admin/users/:userId/make-admin', requireAdminPermission('admin.manage'), logAdminAction('make_user_admin'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.makeUserAdmin(userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error making user admin:", error);
      res.status(500).json({ message: "Failed to make user admin" });
    }
  });

  app.post('/api/admin/users/:userId/remove-admin', requireAdminPermission('admin.manage'), logAdminAction('remove_user_admin'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.removeUserAdmin(userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error removing user admin:", error);
      res.status(500).json({ message: "Failed to remove user admin" });
    }
  });

  // Bible routes
  app.get('/api/bible/books', async (req, res) => {
    try {
      const books = await storage.getBibleBooks();
      res.json(books);
    } catch (error) {
      console.error("Error fetching bible books:", error);
      res.status(500).json({ message: "Failed to fetch bible books" });
    }
  });

  app.get('/api/bible/verse/:bookId/:chapter/:verse', async (req, res) => {
    try {
      const { bookId, chapter, verse } = req.params;
      const translationId = req.query.translationId as string;
      const verseData = await storage.getBibleVerse(bookId, parseInt(chapter), parseInt(verse), translationId);
      if (!verseData) {
        return res.status(404).json({ message: "Verse not found" });
      }
      res.json(verseData);
    } catch (error) {
      console.error("Error fetching verse:", error);
      res.status(500).json({ message: "Failed to fetch verse" });
    }
  });

  app.get('/api/bible/random-verse', async (req, res) => {
    try {
      const translationId = req.query.translationId as string;
      const verse = await storage.getRandomVerse(translationId);
      if (!verse) {
        return res.status(404).json({ message: "No verses available" });
      }
      res.json(verse);
    } catch (error) {
      console.error("Error fetching random verse:", error);
      res.status(500).json({ message: "Failed to fetch random verse" });
    }
  });

  app.get('/api/bible/chapter/:bookId/:chapter', async (req, res) => {
    try {
      const { bookId, chapter } = req.params;
      const translationId = req.query.translationId as string;
      
      // Validate parameters
      if (!bookId || !chapter || isNaN(parseInt(chapter))) {
        return res.status(400).json({ message: "Invalid bookId or chapter parameter" });
      }
      
      // translationId is optional - getChapterVerses will use default if not provided
      const verses = await storage.getChapterVerses(bookId, parseInt(chapter), translationId);
      res.json(verses);
    } catch (error) {
      console.error("Error fetching chapter verses:", error);
      res.status(500).json({ message: "Failed to fetch chapter verses" });
    }
  });

  app.get('/api/bible/book/:bookId/max-chapter', async (req, res) => {
    try {
      const { bookId } = req.params;
      const translationId = req.query.translationId as string;
      
      // Validate parameters
      if (!bookId) {
        return res.status(400).json({ message: "Invalid bookId parameter" });
      }
      
      const maxChapter = await storage.getMaxChapterForBook(bookId, translationId);
      res.json({ maxChapter });
    } catch (error) {
      console.error("Error fetching max chapter:", error);
      res.status(500).json({ message: "Failed to fetch max chapter" });
    }
  });

  // 번들 API: 첫 로딩에 필요한 모든 데이터를 한 번에 제공
  // ⚡ 번들 API: 모든 필요한 초기 데이터를 한 번에 반환 (선택적 프리페칭)
  app.get('/api/bible/initial-data', async (req, res) => {
    try {
      const prefetch = req.query.prefetch === 'true';
      console.log(`📦 번들 API 요청: prefetch=${prefetch}`);
      
      const initialData = await storage.getBibleInitialData(prefetch);
      res.json(initialData);
    } catch (error) {
      console.error("Error fetching initial bible data:", error);
      res.status(500).json({ message: "Failed to fetch initial bible data" });
    }
  });

  // Language and translation routes
  app.get('/api/bible/languages', async (req, res) => {
    try {
      const languages = await storage.getLanguages();
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  app.get('/api/bible/translations', async (req, res) => {
    try {
      const languageCode = req.query.language as string;
      if (!languageCode) {
        return res.status(400).json({ message: "Language code is required" });
      }
      
      const translations = await storage.getTranslationsByLanguage(languageCode);
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  // Typing session routes
  app.post('/api/typing/session', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertTypingSessionSchema.parse({
        ...req.body,
        userId,
      });
      
      const session = await storage.createTypingSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      console.error("Error creating typing session:", error);
      res.status(500).json({ message: "Failed to create typing session" });
    }
  });

  app.get('/api/typing/sessions', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const sessions = await storage.getUserTypingSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching typing sessions:", error);
      res.status(500).json({ message: "Failed to fetch typing sessions" });
    }
  });

  app.get('/api/user/stats', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Church routes
  app.get('/api/churches', async (req, res) => {
    try {
      const search = req.query.search as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Validate limit
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Limit must be between 1 and 100" });
      }
      
      const churches = await storage.getAllChurches(search, limit);
      res.json(churches);
    } catch (error) {
      console.error("Error fetching churches:", error);
      res.status(500).json({ message: "Failed to fetch churches" });
    }
  });

  app.post('/api/churches', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const churchData = insertChurchSchema.parse({
        ...req.body,
        adminId: userId,
      });
      
      const church = await storage.createChurch(churchData);
      
      // Auto-join the creator to the church
      const joinResult = await storage.joinChurch(userId, church.id);
      if (!joinResult.success) {
        console.error("Failed to auto-join church creator:", joinResult.message);
        return res.status(500).json({ message: "Church created but failed to add creator as member" });
      }
      
      res.json(church);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid church data", errors: error.errors });
      }
      console.error("Error creating church:", error);
      res.status(500).json({ message: "Failed to create church" });
    }
  });

  app.get('/api/churches/:id', async (req, res) => {
    try {
      const church = await storage.getChurch(req.params.id);
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      res.json(church);
    } catch (error) {
      console.error("Error fetching church:", error);
      res.status(500).json({ message: "Failed to fetch church" });
    }
  });

  app.post('/api/churches/:id/join', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const churchId = req.params.id;
      
      const joinResult = await storage.joinChurch(userId, churchId);
      
      if (!joinResult.success) {
        // Return appropriate status codes based on the error message
        if (joinResult.message === "Already a member of this church") {
          return res.status(409).json({ message: joinResult.message });
        }
        if (joinResult.message === "Church not found" || joinResult.message === "User not found") {
          return res.status(404).json({ message: joinResult.message });
        }
        return res.status(400).json({ message: joinResult.message });
      }
      
      res.json({ message: joinResult.message });
    } catch (error) {
      console.error("Error joining church:", error);
      res.status(500).json({ message: "Failed to join church" });
    }
  });

  app.get('/api/user/church', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const church = await storage.getUserChurch(userId);
      res.json(church || null);
    } catch (error) {
      console.error("Error fetching user church:", error);
      res.status(500).json({ message: "Failed to fetch user church" });
    }
  });

  // Get church members
  app.get('/api/churches/:id/members', async (req, res) => {
    try {
      const churchId = req.params.id;
      const members = await storage.getChurchMembers(churchId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching church members:", error);
      res.status(500).json({ message: "Failed to fetch church members" });
    }
  });

  // Join church by code
  app.post('/api/churches/join-by-code', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { churchCode } = req.body;

      if (!churchCode || typeof churchCode !== 'string') {
        return res.status(400).json({ message: "교회 코드가 필요합니다." });
      }

      const joinResult = await storage.joinChurchByCode(userId, churchCode);
      
      if (!joinResult.success) {
        // Return appropriate status codes based on the error message
        if (joinResult.message === "Already a member of this church") {
          return res.status(409).json({ message: joinResult.message });
        }
        if (joinResult.message.includes("교회 코드를 찾을 수 없습니다")) {
          return res.status(404).json({ message: joinResult.message });
        }
        return res.status(400).json({ message: joinResult.message });
      }

      res.json({ message: joinResult.message });
    } catch (error) {
      console.error("Error joining church by code:", error);
      res.status(500).json({ message: "Failed to join church by code" });
    }
  });

  // Update church information (admin only)
  app.patch('/api/churches/:id', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const churchId = req.params.id;
      const { name, description } = req.body;

      // Check if the user is the church admin
      const church = await storage.getChurch(churchId);
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }

      if (church.adminId !== userId) {
        return res.status(403).json({ message: "Only church admin can update church information" });
      }

      // Validate input data
      const updateData: Partial<Pick<typeof church, 'name' | 'description'>> = {};
      
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ message: "Valid church name is required" });
        }
        updateData.name = name.trim();
      }

      if (description !== undefined) {
        if (typeof description === 'string') {
          updateData.description = description.trim() || null;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields provided to update" });
      }

      const updatedChurch = await storage.updateChurch(churchId, updateData);
      res.json(updatedChurch);
    } catch (error) {
      console.error("Error updating church:", error);
      res.status(500).json({ message: "Failed to update church" });
    }
  });

  // Leaderboard routes
  app.get('/api/leaderboard/personal', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const cacheKey = `leaderboard:personal:${limit}`;
      
      const leaderboard = await cache.getOrSet(
        cacheKey,
        () => storage.getPersonalLeaderboard(limit),
        TTL.FIVE_MINUTES
      );
      
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching personal leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch personal leaderboard" });
    }
  });

  app.get('/api/leaderboard/churches', async (req, res) => {
    try {
      const sortBy = req.query.sortBy as 'totalPoints' | 'averageWpm' | 'memberCount' || 'totalPoints';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const cacheKey = `leaderboard:churches:${sortBy}:${limit}:${offset}`;
      
      const leaderboard = await cache.getOrSet(
        cacheKey,
        () => storage.getEnhancedChurchLeaderboard(sortBy, limit, offset),
        TTL.TEN_MINUTES
      );
      
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching church leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch church leaderboard" });
    }
  });

  // Enhanced leaderboard routes
  app.get('/api/leaderboard/global', async (req, res) => {
    try {
      const sortBy = req.query.sortBy as 'totalPoints' | 'averageWpm' | 'totalAccuracy' || 'totalPoints';
      const timeRange = req.query.timeRange as 'daily' | 'weekly' | 'monthly' | 'all' || 'all';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const cacheKey = `leaderboard:global:${sortBy}:${timeRange}:${limit}:${offset}`;
      
      const leaderboard = await cache.getOrSet(
        cacheKey,
        () => storage.getGlobalLeaderboard(sortBy, timeRange, limit, offset),
        TTL.FIVE_MINUTES
      );
      
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching global leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch global leaderboard" });
    }
  });

  app.get('/api/leaderboard/church/:churchId', async (req, res) => {
    try {
      const { churchId } = req.params;
      const sortBy = req.query.sortBy as 'totalPoints' | 'averageWpm' | 'totalAccuracy' || 'totalPoints';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const cacheKey = `leaderboard:church:${churchId}:${sortBy}:${limit}:${offset}`;
      
      const leaderboard = await cache.getOrSet(
        cacheKey,
        () => storage.getChurchMemberLeaderboard(churchId, sortBy, limit, offset),
        TTL.FIVE_MINUTES
      );
      
      res.json(leaderboard);
    } catch (error) {
      if (error instanceof Error && error.message === 'Church not found') {
        return res.status(404).json({ message: "Church not found" });
      }
      console.error("Error fetching church member leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch church member leaderboard" });
    }
  });

  app.get('/api/leaderboard/personal/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const cacheKey = `leaderboard:personal:rank:${userId}`;
      
      const rankInfo = await cache.getOrSet(
        cacheKey,
        () => storage.getUserRankInfo(userId),
        TTL.TWO_MINUTES
      );
      
      res.json(rankInfo);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ message: "User not found" });
      }
      console.error("Error fetching user rank info:", error);
      res.status(500).json({ message: "Failed to fetch user rank info" });
    }
  });

  // Challenge routes
  app.get('/api/challenges', async (req, res) => {
    try {
      const challenges = await storage.getActiveChallenges();
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  app.post('/api/challenges/:id/join', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challengeId = req.params.id;
      
      // Check if already participating
      const existing = await storage.getUserChallengeProgress(userId, challengeId);
      if (existing) {
        return res.status(400).json({ message: "Already participating in this challenge" });
      }
      
      const participationData = insertChallengeParticipationSchema.parse({
        userId,
        challengeId,
      });
      
      const participation = await storage.joinChallenge(participationData);
      res.json(participation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid participation data", errors: error.errors });
      }
      console.error("Error joining challenge:", error);
      res.status(500).json({ message: "Failed to join challenge" });
    }
  });

  app.get('/api/challenges/:id/progress', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challengeId = req.params.id;
      
      const progress = await storage.getUserChallengeProgress(userId, challengeId);
      res.json(progress || null);
    } catch (error) {
      console.error("Error fetching challenge progress:", error);
      res.status(500).json({ message: "Failed to fetch challenge progress" });
    }
  });

  // Enhanced Admin routes
  
  // Admin dashboard
  app.get('/api/admin/dashboard', requireAdminPermission('stats.view'), logAdminAction('view_dashboard'), async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard" });
    }
  });
  
  // Admin user management
  app.get('/api/admin/users', requireAdminPermission('users.view'), logAdminAction('list_users'), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const search = req.query.search as string;
      
      // This would need to be implemented in storage
      // For now, return basic user list
      const users = await storage.getAllChurches(search, limit); // Placeholder
      res.json({ users: [], total: 0 }); // Placeholder response
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Admin role management
  app.get('/api/admin/roles', requireAdminPermission('roles.manage'), logAdminAction('list_admin_roles'), async (req, res) => {
    try {
      const adminUsers = await storage.getAllAdminUsers();
      res.json(adminUsers);
    } catch (error) {
      console.error("Error fetching admin roles:", error);
      res.status(500).json({ message: "Failed to fetch admin roles" });
    }
  });
  
  app.post('/api/admin/roles', requireAdminPermission('roles.manage'), logAdminAction('create_admin_role'), async (req, res) => {
    try {
      const grantedBy = (req as any).user.claims.sub;
      const roleData = insertAdminRoleSchema.parse({ ...req.body, grantedBy });
      
      const newRole = await storage.createAdminRole(roleData);
      res.json(newRole);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role data", errors: error.errors });
      }
      console.error("Error creating admin role:", error);
      res.status(500).json({ message: "Failed to create admin role" });
    }
  });
  
  app.delete('/api/admin/roles/:userId/:role', requireAdminPermission('roles.manage'), logAdminAction('remove_admin_role'), async (req, res) => {
    try {
      const { userId, role } = req.params;
      await storage.removeAdminRole(userId, role);
      res.json({ message: 'Admin role removed successfully' });
    } catch (error) {
      console.error("Error removing admin role:", error);
      res.status(500).json({ message: "Failed to remove admin role" });
    }
  });
  
  // Admin access logs
  app.get('/api/admin/logs', requireAdminPermission('logs.view'), logAdminAction('view_access_logs'), async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const logs = await storage.getAdminAccessLogs(userId, limit, offset);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ message: "Failed to fetch admin logs" });
    }
  });
  
  app.get('/api/admin/stats/actions', requireAdminPermission('stats.view'), logAdminAction('view_action_stats'), async (req, res) => {
    try {
      const timeRange = req.query.timeRange as 'daily' | 'weekly' | 'monthly' || 'daily';
      const stats = await storage.getAdminActionStats(timeRange);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching action stats:", error);
      res.status(500).json({ message: "Failed to fetch action stats" });
    }
  });
  
  // 2FA routes
  app.post('/api/admin/2fa/setup', requireAdminPermission('2fa.manage'), logAdminAction('setup_2fa'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { authenticator } = await import('otplib');
      
      // Generate secret
      const secret = authenticator.generateSecret();
      
      // Generate backup codes
      const { nanoid } = await import('nanoid');
      const backupCodes = Array.from({ length: 10 }, () => nanoid(8));
      
      // Save to database
      await storage.createTwoFactorToken(userId, secret, backupCodes);
      
      // Generate QR code URL
      const user = await storage.getUser(userId);
      const otpauth = authenticator.keyuri(user?.email || 'user', '홀리넷 성경필사', secret);
      
      const qrcode = await import('qrcode');
      const qrCodeUrl = await qrcode.toDataURL(otpauth);
      
      res.json({
        secret,
        qrCodeUrl,
        backupCodes,
        message: '2FA setup initiated. Please scan QR code and verify.',
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });
  
  app.post('/api/admin/2fa/verify', requireAdminPermission('2fa.manage'), logAdminAction('verify_2fa'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      const isValid = await storage.verifyTwoFactorToken(userId, token);
      
      if (isValid) {
        await storage.enableTwoFactorAuth(userId);
        res.json({ message: '2FA enabled successfully' });
      } else {
        res.status(400).json({ message: 'Invalid token' });
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ message: "Failed to verify 2FA" });
    }
  });
  
  app.delete('/api/admin/2fa', requireAdminPermission('2fa.manage'), logAdminAction('disable_2fa'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.disableTwoFactorAuth(userId);
      res.json({ message: '2FA disabled successfully' });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });
  
  app.get('/api/admin/2fa/status', requireAdminPermission('2fa.manage'), logAdminAction('view_2fa_status'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const twoFAToken = await storage.getTwoFactorToken(userId);
      
      res.json({
        enabled: !!twoFAToken?.isEnabled,
        backupCodesRemaining: twoFAToken?.backupCodes?.length || 0,
      });
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      res.status(500).json({ message: "Failed to check 2FA status" });
    }
  });

  // Get current user's admin permissions
  app.get('/api/admin/me', isAuthenticatedUnified, async (req: any, res) => {
    try {
      const user = req.session.user;
      
      // Get user's admin roles and permissions
      const adminRoles = await storage.getUserAdminRoles(user.id);
      const permissions = new Set<string>();
      
      // Collect all permissions from roles
      adminRoles.forEach(role => {
        if (role.isActive) {
          role.permissions.forEach(permission => permissions.add(permission));
        }
      });
      
      res.json({
        userId: user.id,
        isAdmin: adminRoles.length > 0,
        roles: adminRoles.filter(role => role.isActive).map(role => role.role),
        permissions: Array.from(permissions)
      });
    } catch (error) {
      console.error('Get admin permissions error:', error);
      res.status(500).json({ message: '권한 정보 조회 중 오류가 발생했습니다.' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
