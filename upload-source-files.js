import { getUncachableGitHubClient } from './server/github.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// 소스 코드 파일들만 선별적으로 수집 
function getSourceFiles(dir, baseDir = dir) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    // 제외할 디렉토리들 (node_modules, .cache는 제외하되 사용자 요청대로 다른 것들은 포함)
    if (item === 'node_modules' || 
        item === '.cache' ||
        item === '.git' ||
        item === '.next' ||
        item === 'dist' ||
        item === 'build') {
      continue;
    }
    
    if (stat.isDirectory()) {
      files.push(...getSourceFiles(fullPath, baseDir));
    } else {
      const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
      
      // 사용자가 요청한 대로 모든 파일 포함 (node_modules 등 제외만)
      try {
        let content;
        let encoding = 'utf8';
        
        // 바이너리 파일들은 base64로 처리
        const isBinary = /\.(png|jpg|jpeg|gif|ico|db|db-shm|db-wal|tgz|aa|ab|woff|woff2|ttf|eot|svg|pdf|zip|tar|gz)$/i.test(item);
        
        if (isBinary) {
          // 큰 파일은 스킵 (100MB 초과)
          if (stat.size > 100 * 1024 * 1024) {
            console.log(`⚠️  파일 크기 초과로 스킵: ${relativePath} (${Math.round(stat.size/1024/1024)}MB)`);
            continue;
          }
          content = readFileSync(fullPath);
          encoding = 'base64';
        } else {
          content = readFileSync(fullPath, 'utf8');
        }
        
        files.push({
          path: relativePath,
          content: content,
          encoding: encoding,
          size: stat.size
        });
        
      } catch (error) {
        console.warn(`⚠️  파일 읽기 실패: ${relativePath} - ${error.message}`);
      }
    }
  }
  
  return files;
}

async function uploadSourceFiles() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'waabaa';
    const repo = 'redit-holytyping';
    
    console.log('📁 소스 파일 수집 시작...');
    const files = getSourceFiles('./');
    console.log(`📊 총 ${files.length}개 파일 발견`);
    
    // 파일 크기별로 분류
    const regularFiles = files.filter(f => f.size < 1024 * 1024); // 1MB 미만
    const largeFiles = files.filter(f => f.size >= 1024 * 1024);   // 1MB 이상
    
    console.log(`✅ 일반 파일: ${regularFiles.length}개`);
    console.log(`⚡ 큰 파일: ${largeFiles.length}개`);
    
    if (largeFiles.length > 0) {
      console.log('큰 파일들:');
      largeFiles.forEach(f => console.log(`   ${f.path} (${Math.round(f.size/1024)}KB)`));
    }
    
    // 상세한 README.md로 업데이트
    const readmeContent = `# Redit HolyTyping 📖✨

한국어 인터페이스를 가진 다국어 성경 타이핑 연습 서비스

> **프로젝트 상태**: 완전 기능 구현 완료 ✅

## 🎯 프로젝트 개요

**Redit HolyTyping**은 성경 필사를 통한 타이핑 연습과 영성 훈련을 결합한 혁신적인 웹 애플리케이션입니다. 개인 사용자부터 교회 공동체까지, 다양한 환경에서 성경과 친숙해질 수 있도록 설계되었습니다.

## ✨ 주요 기능

### 📖 **다국어 성경 타이핑**
- **4개 언어 지원**: 한국어(개역개정), 영어(ESV), 중국어(简体), 일본어(聖書)
- **실시간 타이핑 검증**: 정확도, 속도(WPM), 진도율 실시간 추적
- **성경 전체 수록**: 구약 39권 + 신약 27권 완전 수록

### 🏆 **경쟁 & 도전**
- **개인 리더보드**: WPM, 정확도, 총점 기반 순위
- **교회별 리더보드**: 소속 교회 단위 그룹 경쟁
- **도전 과제**: 특정 성경 구절, 시간 제한 챌린지
- **진도 추적**: 개인별 성경 읽기 진도 시각화

### ⛪ **교회 커뮤니티**
- **교회 등록**: 교회별 고유 코드로 멤버십 관리
- **그룹 통계**: 교회별 평균 성과, 활동 현황
- **공동 목표**: 교회 단위 성경 필사 프로젝트

### 🔐 **보안 강화 인증**
- **다중 로그인**: 이메일 + 소셜 로그인 (Google, Kakao, Naver)
- **2FA 지원**: TOTP 기반 이중 인증
- **세션 관리**: 서버 기반 안전한 세션 저장
- **비밀번호 보안**: bcrypt 해싱, 복잡도 검증

### 👑 **4단계 관리자 시스템**
- **Super Admin**: 시스템 전체 권한 (37개 권한)
- **Content Admin**: 성경 콘텐츠, 챌린지 관리
- **User Admin**: 사용자, 교회 관리
- **Stats Viewer**: 통계 조회 전용

### 🎯 **실시간 통계**
- **타이핑 메트릭**: WPM, 정확도, 일관성
- **진도 추적**: 구약/신약별 완주율
- **시간 분석**: 세션별, 일별, 월별 통계
- **성과 비교**: 개인 vs 평균 vs 교회 평균

## 🛠 기술 스택

### Frontend
- **React 18** + **TypeScript** (타입 안전성)
- **Vite** (빠른 번들링 & HMR)
- **TanStack Query** (서버 상태 관리)
- **Wouter** (경량 라우팅)
- **Tailwind CSS** + **shadcn/ui** (모던 UI)
- **React Hook Form** + **Zod** (폼 관리)

### Backend
- **Express.js** + **TypeScript** (RESTful API)
- **Drizzle ORM** (타입 안전 데이터베이스 쿼리)
- **PostgreSQL** (Neon 서버리스 호스팅)
- **bcrypt** (패스워드 해싱)
- **express-session** (세션 관리)
- **otplib** (2FA TOTP)

### Authentication & Security
- **Replit Auth** (OpenID Connect)
- **OAuth 2.0** (Google, Kakao, Naver)
- **RBAC** (Role-Based Access Control)
- **CSRF Protection** (Cross-Site Request Forgery 방지)
- **Input Validation** (Zod 스키마 검증)

### Infrastructure
- **Replit** (개발/호스팅 플랫폼)
- **Neon Database** (PostgreSQL 서버리스)
- **GitHub** (버전 관리)
- **Resend** (이메일 서비스)

## 🏗 시스템 아키텍처

### 데이터베이스 스키마
\`\`\`sql
-- 사용자 관리
users (id, email, name, typing_stats, church_id, profile_completed)
admin_roles (user_id, role, permissions[], granted_by, granted_at)
sessions (sid, session_data, expires_at)

-- 성경 데이터  
bible_books (id, name, testament, order)
bible_verses (id, book_id, chapter, verse, korean_text, english_text, chinese_text, japanese_text)

-- 교회 & 커뮤니티
churches (id, name, description, church_code, member_count)
church_members (church_id, user_id, joined_at, role)

-- 타이핑 & 통계
typing_sessions (id, user_id, book_id, chapter, wpm, accuracy, duration, completed_at)
user_progress (user_id, book_id, chapters_completed, total_verses)

-- 챌린지 & 도전
challenges (id, title, description, target_verses, time_limit, reward_points)
challenge_participants (challenge_id, user_id, completion_status, score)
\`\`\`

### API 설계
\`\`\`
Authentication:
POST /api/auth/email/login     - 이메일 로그인
POST /api/auth/email/register  - 이메일 회원가입
GET  /api/auth/user           - 현재 사용자 정보
POST /api/logout              - 로그아웃

Bible & Typing:
GET  /api/bible/books         - 성경 목록
GET  /api/bible/chapter/:book/:chapter - 성경 본문
POST /api/typing/session      - 타이핑 세션 저장
GET  /api/user/stats          - 사용자 통계

Community:
GET  /api/churches            - 교회 목록  
POST /api/churches/join       - 교회 가입
GET  /api/leaderboard/personal - 개인 순위
GET  /api/leaderboard/church  - 교회 순위

Admin:
GET  /api/admin/me            - 관리자 권한 확인
GET  /api/admin/users         - 사용자 관리
POST /api/admin/roles         - 역할 권한 설정
GET  /api/admin/logs          - 접근 로그
\`\`\`

## 🚀 설치 및 실행

### 1. 저장소 클론
\`\`\`bash
git clone https://github.com/waabaa/redit-holytyping.git
cd redit-holytyping
\`\`\`

### 2. 의존성 설치
\`\`\`bash
npm install
\`\`\`

### 3. 환경 변수 설정
\`\`\`.env
# 필수 - 데이터베이스
DATABASE_URL=postgresql://username:password@host:port/database

# 필수 - 세션 보안
SESSION_SECRET=your-super-secret-session-key-at-least-32-chars

# 선택 - 소셜 로그인
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
KAKAO_CLIENT_ID=your-kakao-client-id  
KAKAO_CLIENT_SECRET=your-kakao-client-secret
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret

# 선택 - 이메일 서비스
RESEND_API_KEY=your-resend-api-key
\`\`\`

### 4. 데이터베이스 초기화
\`\`\`bash
# 스키마 동기화
npm run db:push

# 초기 데이터 시딩 (성경 데이터, 테스트 사용자)
npm run db:seed
\`\`\`

### 5. 개발 서버 실행
\`\`\`bash
npm run dev
\`\`\`

서버가 \`http://localhost:5000\`에서 실행됩니다.

## 🔧 개발 가이드

### 폴더 구조
\`\`\`
redit-holytyping/
├── client/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/      # UI 컴포넌트
│   │   │   ├── ui/         # shadcn/ui 기본 컴포넌트
│   │   │   ├── header.tsx  # 네비게이션 헤더
│   │   │   └── ...
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── hooks/          # 커스텀 훅
│   │   ├── lib/            # 유틸리티
│   │   └── App.tsx         # 메인 앱 컴포넌트
│   └── index.html          # HTML 엔트리포인트
├── server/                   # Express 백엔드
│   ├── index.ts            # 서버 엔트리포인트
│   ├── routes.ts           # API 라우트 정의
│   ├── storage.ts          # 데이터베이스 레이어
│   ├── koreanOAuth.ts      # 한국 소셜 로그인
│   └── ...
├── shared/                   # 프론트엔드-백엔드 공유
│   └── schema.ts           # Drizzle 스키마 & 타입
├── migrations/               # 데이터베이스 마이그레이션
├── scripts/                  # 유틸리티 스크립트
└── tests/                    # 테스트 코드
\`\`\`

### 주요 명령어
\`\`\`bash
npm run dev         # 개발 서버 실행
npm run build       # 프로덕션 빌드
npm run start       # 프로덕션 서버 실행
npm run db:push     # 데이터베이스 스키마 동기화
npm run db:seed     # 초기 데이터 시딩
npm test           # 테스트 실행
\`\`\`

### 관리자 계정 설정
\`\`\`sql
-- 개발용 슈퍼 관리자 계정 생성
INSERT INTO admin_roles (user_id, role, permissions, granted_by)
SELECT 
    id, 
    'super_admin',
    '[
        "admin.manage", "users.view", "users.edit", "users.ban", "users.delete",
        "roles.manage", "logs.view", "stats.view", "settings.manage", "2fa.manage",
        "content.manage", "bible.manage", "church.manage", "challenge.manage",
        "backup.manage", "analytics.view", "export.data", "import.data"
    ]'::jsonb,
    id
FROM users 
WHERE email = 'your-admin-email@example.com';
\`\`\`

## 🎨 UI/UX 특징

### 디자인 시스템
- **컬러 팔레트**: 모던하고 차분한 톤 (Primary: Blue, Accent: Orange)
- **타이포그래피**: 가독성 최적화, 한글 폰트 지원
- **간격 체계**: 일관된 8px 그리드 시스템
- **애니메이션**: 부드러운 트랜지션, 로딩 상태 표시

### 반응형 디자인
- **모바일**: 320px ~ 768px (터치 최적화)
- **태블릿**: 768px ~ 1024px (하이브리드 인터페이스)
- **데스크톱**: 1024px 이상 (풀 기능)

### 접근성 (A11Y)
- **ARIA 라벨**: 스크린 리더 지원
- **키보드 네비게이션**: 전체 기능 키보드 접근 가능
- **색상 대비**: WCAG 2.1 AA 수준 준수
- **포커스 표시**: 명확한 포커스 링

## 🔒 보안 기능

### 인증 보안
- **패스워드**: bcrypt (salt rounds: 12) + 복잡도 검증
- **세션**: HTTPOnly 쿠키, Secure 플래그, SameSite 보호
- **2FA**: TOTP 백업 코드 지원
- **로그인 시도 제한**: Rate limiting + 임시 잠금

### 데이터 보호
- **입력 검증**: Zod 스키마 기반 strict validation
- **SQL Injection**: Drizzle ORM parameterized queries
- **XSS**: React 기본 escape + CSP 헤더
- **CSRF**: Double submit cookie pattern

### 관리자 보안
- **권한 로깅**: 모든 관리자 행동 추적
- **민감 데이터 마스킹**: 로그에서 비밀번호, 토큰 제거
- **세션 관리**: 관리자 세션 타임아웃 단축
- **IP 제한**: 관리자 접근 IP 화이트리스트 (선택)

## 📈 성능 최적화

### 프론트엔드 최적화
- **코드 스플리팅**: 페이지별 동적 import
- **이미지 최적화**: WebP 포맷, lazy loading
- **캐싱**: TanStack Query 적극 활용
- **번들 크기**: Tree shaking, 불필요한 라이브러리 제거

### 백엔드 최적화
- **데이터베이스**: 인덱싱, 쿼리 최적화
- **API 응답**: gzip 압축, HTTP/2
- **세션**: Redis 캐시 (선택사항)
- **로깅**: 구조화된 JSON 로깅

### 모니터링
- **성능 추적**: Core Web Vitals
- **오류 추적**: 클라이언트/서버 오류 로깅
- **사용자 분석**: 익명화된 사용 패턴
- **서버 모니터링**: CPU, 메모리, DB 성능

## 🚀 배포 및 운영

### Replit 배포
1. Replit에서 GitHub 저장소 import
2. 환경 변수 설정 (Database, OAuth 키)
3. \`npm install\` 자동 실행
4. Deploy 버튼으로 배포

### 프로덕션 준비사항
- [ ] PostgreSQL 프로덕션 데이터베이스 설정
- [ ] 도메인 연결 및 SSL 인증서
- [ ] OAuth 앱 설정 (프로덕션 도메인)
- [ ] 이메일 서비스 설정 (Resend)
- [ ] 모니터링 도구 연결

## 🤝 기여 가이드

### 개발 워크플로우
1. **이슈 생성**: 새 기능 또는 버그 제보
2. **브랜치 생성**: \`feature/기능명\` 또는 \`fix/버그명\`
3. **개발**: 코드 작성 + 테스트 추가
4. **Pull Request**: 상세한 설명과 스크린샷
5. **코드 리뷰**: 최소 1명 승인 후 머지

### 코드 규칙
- **TypeScript**: 엄격한 타입 검사
- **ESLint + Prettier**: 일관된 코드 스타일
- **커밋 메시지**: Conventional Commits 규칙
- **테스트**: 새 기능은 반드시 테스트 포함

## 📊 프로젝트 현황

### 구현 완료 ✅
- [x] 사용자 인증 시스템 (이메일, 소셜, 2FA)
- [x] 4개 언어 성경 타이핑 시스템
- [x] 실시간 통계 추적
- [x] 교회 커뮤니티 기능
- [x] 4단계 관리자 시스템
- [x] 리더보드 및 순위 시스템
- [x] 모바일 반응형 UI
- [x] 다크 모드 지원

### 개발 예정 🚧
- [ ] 오프라인 모드 지원
- [ ] 모바일 앱 (React Native)
- [ ] 음성 안내 기능
- [ ] AI 기반 타이핑 분석
- [ ] 소셜 공유 기능

## 📝 라이선스

**MIT License** - 자유롭게 사용, 수정, 배포 가능

## 🙏 감사 인사

- **성경 텍스트**: 대한성서공회, ESV, NIV, Chinese Union Version
- **오픈소스 라이브러리**: React, Express, Drizzle, Tailwind CSS
- **호스팅**: Replit, Neon Database
- **디자인**: shadcn/ui, Lucide Icons
- **테스팅**: Vitest, Playwright

---

**"모든 성경은 하나님의 감동으로 된 것으로 교훈과 책망과 바르게 함과 의로 교육하기에 유익하니" (디모데후서 3:16)**

*Developed with ❤️ for Bible typing practice and spiritual growth*

## 📞 연락처

- **개발자**: waabaa
- **GitHub**: https://github.com/waabaa
- **프로젝트**: https://github.com/waabaa/redit-holytyping
- **이슈 제보**: [GitHub Issues](https://github.com/waabaa/redit-holytyping/issues)
`;

    console.log('📤 파일 업로드 시작...');
    const uploadedFiles = [];
    let successCount = 0;
    let errorCount = 0;
    
    // 배치로 업로드 (너무 많으면 API 제한에 걸림)
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 배치 ${batchIndex + 1}/${batches.length} 처리 중... (${batch.length}개 파일)`);
      
      for (const file of batch) {
        try {
          let contentForUpload;
          
          if (file.encoding === 'base64') {
            contentForUpload = file.content.toString('base64');
          } else {
            contentForUpload = Buffer.from(file.content, 'utf8').toString('base64');
          }
          
          // 기존 파일이 있으면 업데이트, 없으면 생성
          try {
            // 파일 존재 확인
            const { data: existingFile } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: file.path
            });
            
            // 파일이 존재하면 업데이트
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: file.path,
              message: `Update: ${file.path}`,
              content: contentForUpload,
              sha: existingFile.sha
            });
            
          } catch (notFoundError) {
            // 파일이 없으면 새로 생성
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: file.path,
              message: `Add: ${file.path}`,
              content: contentForUpload
            });
          }
          
          uploadedFiles.push(file.path);
          successCount++;
          
        } catch (error) {
          console.error(`❌ ${file.path}: ${error.message}`);
          errorCount++;
        }
      }
      
      // 배치 사이 잠시 대기 (API 제한 방지)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // README.md 업데이트
    try {
      const { data: existingReadme } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'README.md'
      });
      
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Update: Comprehensive project documentation',
        content: Buffer.from(readmeContent, 'utf8').toString('base64'),
        sha: existingReadme.sha
      });
      
      console.log('✅ README.md 업데이트 완료');
    } catch (error) {
      console.error('❌ README.md 업데이트 실패:', error.message);
    }
    
    console.log('\\n🎉 업로드 완료!');
    console.log(`📁 저장소: https://github.com/${owner}/${repo}`);
    console.log(`✅ 성공: ${successCount}개 파일`);
    console.log(`❌ 실패: ${errorCount}개 파일`);
    console.log(`📊 총 파일: ${files.length}개`);
    
    if (successCount > 0) {
      console.log('\\n업로드된 주요 파일들:');
      uploadedFiles.slice(0, 10).forEach(file => console.log(`   ✓ ${file}`));
      if (uploadedFiles.length > 10) {
        console.log(`   ... 및 ${uploadedFiles.length - 10}개 추가 파일`);
      }
    }
    
  } catch (error) {
    console.error('❌ 전체 업로드 실패:', error.message);
  }
}

uploadSourceFiles();