import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs; // 기본 15분
    this.maxRequests = maxRequests; // 기본 5회
    
    // 주기적으로 만료된 항목 정리 (5분마다)
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(req: Request): string {
    // IP 주소와 User-Agent를 조합하여 키 생성
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${ip}:${userAgent.substring(0, 50)}`;
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      let entry = this.store.get(key);
      
      if (!entry || now > entry.resetTime) {
        // 새 윈도우 시작
        entry = {
          count: 1,
          resetTime: now + this.windowMs
        };
        this.store.set(key, entry);
        return next();
      }
      
      if (entry.count >= this.maxRequests) {
        // 요청 한도 초과
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        res.set({
          'X-RateLimit-Limit': this.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': retryAfter.toString()
        });
        
        return res.status(429).json({
          message: `요청이 너무 많습니다. ${Math.ceil(retryAfter / 60)}분 후에 다시 시도해주세요.`,
          retryAfter: retryAfter
        });
      }
      
      // 요청 카운트 증가
      entry.count++;
      this.store.set(key, entry);
      
      // 헤더 설정
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.maxRequests - entry.count).toString(),
        'X-RateLimit-Reset': entry.resetTime.toString()
      });
      
      next();
    };
  }
}

// 각 엔드포인트별 제한 설정
export const authRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1000, // 15분
  5 // 최대 5회 시도
);

export const verifyRateLimiter = new MemoryRateLimiter(
  10 * 60 * 1000, // 10분
  3 // 최대 3회 시도 (이메일 인증은 더 엄격하게)
);