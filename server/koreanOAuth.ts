import type { Express, RequestHandler } from "express";
import { nanoid } from "nanoid";
import CryptoJS from "crypto-js";
import { storage } from "./storage";
import "./types"; // Import session type augmentation

// Types for OAuth responses
interface KakaoUserInfo {
  id: number;
  properties: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
  };
}

interface NaverUserInfo {
  resultcode: string;
  message: string;
  response: {
    id: string;
    nickname?: string;
    email?: string;
    name?: string;
    profile_image?: string;
  };
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

// Store state tokens and PKCE verifiers temporarily (in production, use Redis or database)
const stateStore = new Map<string, { provider: string; createdAt: number; codeVerifier?: string }>();

// Clean up expired state tokens (older than 10 minutes)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [state, data] of Array.from(stateStore.entries())) {
    if (data.createdAt < tenMinutesAgo) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

/**
 * Generate a secure state parameter for OAuth flow with optional PKCE
 */
function generateState(provider: string, codeVerifier?: string): string {
  const state = nanoid(32);
  stateStore.set(state, { provider, createdAt: Date.now(), codeVerifier });
  return state;
}

/**
 * Validate state parameter and get provider + PKCE verifier
 */
function validateState(state: string): { provider: string; codeVerifier?: string } | null {
  const data = stateStore.get(state);
  if (!data) return null;
  
  stateStore.delete(state); // One-time use
  return { provider: data.provider, codeVerifier: data.codeVerifier };
}

/**
 * Get OAuth configuration based on provider
 */
function getOAuthConfig(provider: string) {
  switch (provider) {
    case 'kakao':
      return {
        clientId: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET,
        authUrl: 'https://kauth.kakao.com/oauth/authorize',
        tokenUrl: 'https://kauth.kakao.com/oauth/token',
        userInfoUrl: 'https://kapi.kakao.com/v2/user/me',
        scope: 'profile_nickname,profile_image,account_email',
      };
    case 'naver':
      return {
        clientId: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        authUrl: 'https://nid.naver.com/oauth2.0/authorize',
        tokenUrl: 'https://nid.naver.com/oauth2.0/token',
        userInfoUrl: 'https://openapi.naver.com/v1/nid/me',
        scope: 'name,email,profile_image',
      };
    case 'google':
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
      };
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE() {
  const codeVerifier = nanoid(128); // 128 character random string
  const codeChallenge = CryptoJS.SHA256(codeVerifier)
    .toString(CryptoJS.enc.Base64url)
    .replace(/=/g, '');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Get allowed redirect URI based on environment and request
 */
function getAllowedRedirectUri(req: any, provider: string): string {
  // Allow explicit override for production deployments
  if (process.env.PUBLIC_BASE_URL) {
    const redirectUri = `${process.env.PUBLIC_BASE_URL}/auth/${provider}/callback`;
    console.log(`OAuth ${provider} - Using PUBLIC_BASE_URL override: ${redirectUri}`);
    return redirectUri;
  }
  
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('host') || req.hostname;
  
  console.log(`OAuth ${provider} - Protocol: ${protocol}, Host: ${host}`);
  
  // Always derive from the actual request
  const redirectUri = `${protocol}://${host}/auth/${provider}/callback`;
  console.log(`OAuth ${provider} - Final redirect URI: ${redirectUri}`);
  return redirectUri;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  provider: string,
  code: string,
  redirectUri: string,
  state?: string,
  codeVerifier?: string
): Promise<OAuthTokenResponse> {
  const config = getOAuthConfig(provider);
  
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Missing ${provider.toUpperCase()} OAuth credentials`);
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  // Add PKCE code verifier for Google (and optionally other providers)
  if ((provider === 'google' || provider === 'naver') && codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  // Naver requires state parameter in token exchange
  if (provider === 'naver' && state) {
    params.append('state', state);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token exchange failed: ${errorData}`);
  }

  return await response.json();
}

/**
 * Get user information from OAuth provider
 */
async function getUserInfo(provider: string, accessToken: string): Promise<KakaoUserInfo | NaverUserInfo | GoogleUserInfo> {
  const config = getOAuthConfig(provider);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };

  // Naver requires additional headers
  if (provider === 'naver') {
    headers['X-Naver-Client-Id'] = config.clientId!;
    headers['X-Naver-Client-Secret'] = config.clientSecret!;
  }

  const response = await fetch(config.userInfoUrl, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`User info fetch failed: ${errorData}`);
  }

  return await response.json();
}

/**
 * Convert OAuth user info to our user format
 */
function convertToSafeAuthUser(provider: string, userInfo: KakaoUserInfo | NaverUserInfo | GoogleUserInfo) {
  if (provider === 'kakao') {
    const kakaoUser = userInfo as KakaoUserInfo;
    return {
      id: undefined, // Let the system generate a new ID
      email: kakaoUser.kakao_account.email,
      firstName: kakaoUser.kakao_account.profile?.nickname || kakaoUser.properties.nickname,
      lastName: undefined,
      profileImageUrl: kakaoUser.kakao_account.profile?.profile_image_url || kakaoUser.properties.profile_image,
      authProvider: 'kakao',
      authProviderId: kakaoUser.id.toString(),
      emailVerified: true, // OAuth providers verify email
    };
  } else if (provider === 'naver') {
    const naverUser = userInfo as NaverUserInfo;
    if (naverUser.resultcode !== '00') {
      throw new Error(`Naver API error: ${naverUser.message}`);
    }
    
    // Split name into first and last name if available
    const fullName = naverUser.response.name || naverUser.response.nickname;
    const firstName = fullName;
    
    return {
      id: undefined,
      email: naverUser.response.email,
      firstName,
      lastName: undefined,
      profileImageUrl: naverUser.response.profile_image,
      authProvider: 'naver',
      authProviderId: naverUser.response.id,
      emailVerified: true, // OAuth providers verify email
    };
  } else if (provider === 'google') {
    const googleUser = userInfo as GoogleUserInfo;
    
    return {
      id: undefined,
      email: googleUser.email,
      firstName: googleUser.given_name || googleUser.name,
      lastName: googleUser.family_name,
      profileImageUrl: googleUser.picture,
      authProvider: 'google',
      authProviderId: googleUser.id,
      emailVerified: googleUser.verified_email, // Use Google's email verification status
    };
  }
  
  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Setup Korean OAuth routes
 */
export function setupKoreanOAuth(app: Express) {
  // Kakao login initiation
  app.get('/auth/kakao', (req, res) => {
    const config = getOAuthConfig('kakao');
    
    if (!config.clientId) {
      return res.status(500).json({ message: 'Kakao OAuth not configured' });
    }

    try {
      const redirectUri = getAllowedRedirectUri(req, 'kakao');
      const state = generateState('kakao');
      
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope,
        state,
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;
      res.redirect(authUrl);
    } catch (error) {
      console.error('Kakao OAuth initiation error:', error);
      res.status(400).json({ message: 'Invalid OAuth configuration' });
    }
  });

  // Naver login initiation
  app.get('/auth/naver', (req, res) => {
    console.log('🟢 Naver OAuth 시작');
    const config = getOAuthConfig('naver');
    
    if (!config.clientId) {
      console.error('❌ Naver OAuth 클라이언트 ID가 설정되지 않음');
      return res.status(500).json({ message: 'Naver OAuth not configured' });
    }

    try {
      const redirectUri = getAllowedRedirectUri(req, 'naver');
      console.log(`🟢 Naver OAuth - Final redirect URI: ${redirectUri}`);
      
      const { codeVerifier, codeChallenge } = generatePKCE();
      console.log(`🟢 Naver OAuth - PKCE 생성 완료: challenge=${codeChallenge.substring(0, 20)}...`);
      
      const state = generateState('naver', codeVerifier);
      console.log(`🟢 Naver OAuth - State 생성: ${state.substring(0, 20)}...`);
      
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;
      console.log(`🟢 Naver OAuth - 최종 URL: ${authUrl}`);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Naver OAuth initiation error:', error);
      res.status(400).json({ message: 'Invalid OAuth configuration' });
    }
  });

  // Google login initiation
  app.get('/auth/google', (req, res) => {
    console.log('🔵 Google OAuth 시작');
    const config = getOAuthConfig('google');
    
    if (!config.clientId) {
      console.error('❌ Google OAuth 클라이언트 ID가 설정되지 않음');
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    try {
      const redirectUri = getAllowedRedirectUri(req, 'google');
      console.log(`🔵 Google OAuth - Final redirect URI: ${redirectUri}`);
      
      const { codeVerifier, codeChallenge } = generatePKCE();
      console.log(`🔵 Google OAuth - PKCE 생성 완료: challenge=${codeChallenge.substring(0, 20)}...`);
      
      const state = generateState('google', codeVerifier);
      console.log(`🔵 Google OAuth - State 생성: ${state.substring(0, 20)}...`);
      
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope,
        state,
        access_type: 'offline', // Required for Google OAuth
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;
      console.log(`🔵 Google OAuth - 최종 URL: ${authUrl}`);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Google OAuth initiation error:', error);
      res.status(400).json({ message: 'Invalid OAuth configuration' });
    }
  });

  // Kakao callback handler
  app.get('/auth/kakao/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('Kakao OAuth error:', error);
        return res.redirect('/?error=oauth_denied');
      }

      if (!code || !state) {
        return res.redirect('/?error=oauth_invalid');
      }

      // Validate state
      const stateData = validateState(state as string);
      if (!stateData || stateData.provider !== 'kakao') {
        return res.redirect('/?error=oauth_state_mismatch');
      }

      // Exchange code for token
      const redirectUri = getAllowedRedirectUri(req, 'kakao');
      const tokenResponse = await exchangeCodeForToken('kakao', code as string, redirectUri);

      // Get user information
      const userInfo = await getUserInfo('kakao', tokenResponse.access_token);

      // Convert to our user format and save
      const safeAuthUser = convertToSafeAuthUser('kakao', userInfo);
      const user = await storage.safeUpsertUserFromAuth(safeAuthUser);

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Kakao session regeneration error:', err);
          return res.redirect('/?error=session_error');
        }

        // Set up session after regeneration
        req.session.user = {
          id: user.id,
          email: user.email || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          profileImageUrl: user.profileImageUrl || undefined,
          authProvider: user.authProvider || undefined,
        };

        // Save session to ensure it's persisted
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Kakao session save error:', saveErr);
            return res.redirect('/?error=session_error');
          }

          // Redirect to profile completion or home based on user profile completeness
          if (!user.age || !user.region) {
            res.redirect('/complete-profile');
          } else {
            res.redirect('/');
          }
        });
      });
    } catch (error) {
      console.error('Kakao OAuth callback error:', error);
      res.redirect('/?error=oauth_error');
    }
  });

  // Naver callback handler
  app.get('/auth/naver/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('Naver OAuth error:', error);
        return res.redirect('/?error=oauth_denied');
      }

      if (!code || !state) {
        return res.redirect('/?error=oauth_invalid');
      }

      // Validate state
      const stateData = validateState(state as string);
      if (!stateData || stateData.provider !== 'naver') {
        return res.redirect('/?error=oauth_state_mismatch');
      }

      // Exchange code for token
      const redirectUri = getAllowedRedirectUri(req, 'naver');
      const tokenResponse = await exchangeCodeForToken(
        'naver', 
        code as string, 
        redirectUri, 
        state as string, 
        stateData.codeVerifier
      );

      // Get user information
      const userInfo = await getUserInfo('naver', tokenResponse.access_token);

      // Convert to our user format and save
      const safeAuthUser = convertToSafeAuthUser('naver', userInfo);
      const user = await storage.safeUpsertUserFromAuth(safeAuthUser);

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Naver session regeneration error:', err);
          return res.redirect('/?error=session_error');
        }

        // Set up session after regeneration
        req.session.user = {
          id: user.id,
          email: user.email || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          profileImageUrl: user.profileImageUrl || undefined,
          authProvider: user.authProvider || undefined,
        };

        // Save session to ensure it's persisted
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Naver session save error:', saveErr);
            return res.redirect('/?error=session_error');
          }

          // Redirect to profile completion or home based on user profile completeness
          if (!user.age || !user.region) {
            res.redirect('/complete-profile');
          } else {
            res.redirect('/');
          }
        });
      });
    } catch (error) {
      console.error('Naver OAuth callback error:', error);
      res.redirect('/?error=oauth_error');
    }
  });

  // Google callback handler
  app.get('/auth/google/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect('/?error=oauth_denied');
      }

      if (!code || !state) {
        return res.redirect('/?error=oauth_invalid');
      }

      // Validate state
      const stateData = validateState(state as string);
      if (!stateData || stateData.provider !== 'google') {
        return res.redirect('/?error=oauth_state_mismatch');
      }

      // Exchange code for token
      const redirectUri = getAllowedRedirectUri(req, 'google');
      const tokenResponse = await exchangeCodeForToken(
        'google', 
        code as string, 
        redirectUri, 
        undefined, 
        stateData.codeVerifier
      );

      // Get user information
      const userInfo = await getUserInfo('google', tokenResponse.access_token);

      // Convert to our user format and save
      const safeAuthUser = convertToSafeAuthUser('google', userInfo);
      const user = await storage.safeUpsertUserFromAuth(safeAuthUser);

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Google session regeneration error:', err);
          return res.redirect('/?error=session_error');
        }

        // Set up session after regeneration
        req.session.user = {
          id: user.id,
          email: user.email || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          profileImageUrl: user.profileImageUrl || undefined,
          authProvider: user.authProvider || undefined,
        };

        // Save session to ensure it's persisted
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Google session save error:', saveErr);
            return res.redirect('/?error=session_error');
          }

          // Redirect to profile completion or home based on user profile completeness
          if (!user.age || !user.region) {
            res.redirect('/complete-profile');
          } else {
            res.redirect('/');
          }
        });
      });
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/?error=oauth_error');
    }
  });
}

/**
 * Check if user is authenticated via Korean OAuth
 */
export const isKoreanOAuthAuthenticated: RequestHandler = (req, res, next) => {
  const user = req.session?.user;
  
  if (!user || !user.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Add user info to request for downstream handlers
  (req as any).user = {
    claims: { sub: user.id },
    ...user,
  };

  next();
};