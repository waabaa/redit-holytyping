import { getUncachableGitHubClient } from './server/github.js';
import { readFileSync, existsSync } from 'fs';

async function uploadCoreFiles() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'waabaa';
    const repo = 'redit-holytyping';
    
    // 핵심 파일들만 선별 (실제 소스코드와 설정 파일)
    const coreFiles = [
      // 프로젝트 루트 설정 파일들
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'components.json',
      'drizzle.config.ts',
      'replit.md',
      
      // 클라이언트 핵심 파일들
      'client/index.html',
      'client/src/App.tsx',
      'client/src/main.tsx',
      'client/src/index.css',
      
      // 핵심 컴포넌트들
      'client/src/components/header.tsx',
      'client/src/components/AuthModal.tsx',
      'client/src/components/SignupModal.tsx',
      'client/src/components/typing-practice.tsx',
      'client/src/components/stats-display.tsx',
      
      // 페이지들  
      'client/src/pages/home.tsx',
      'client/src/pages/dashboard.tsx',
      'client/src/pages/practice.tsx',
      'client/src/pages/profile.tsx',
      'client/src/pages/complete-profile.tsx',
      'client/src/pages/admin-dashboard.tsx',
      'client/src/pages/admin-users.tsx',
      'client/src/pages/admin-roles.tsx',
      'client/src/pages/admin-logs.tsx',
      'client/src/pages/admin-settings.tsx',
      
      // 훅스
      'client/src/hooks/useAuth.ts',
      'client/src/hooks/useAdminPermissions.ts',
      'client/src/hooks/use-toast.ts',
      
      // 라이브러리
      'client/src/lib/queryClient.ts',
      'client/src/lib/utils.ts',
      
      // 서버 핵심 파일들
      'server/index.ts',
      'server/routes.ts', 
      'server/storage.ts',
      'server/db.ts',
      'server/types.ts',
      'server/koreanOAuth.ts',
      'server/cache.ts',
      'server/rateLimiter.ts',
      'server/emailService.ts',
      'server/vite.ts',
      
      // 공유 스키마
      'shared/schema.ts',
      
      // 마이그레이션
      'migrations/0000_material_scourge.sql',
      'migrations/meta/_journal.json',
      'migrations/meta/0000_snapshot.json',
      
      // 첨부 파일들 (사용자 요청에 따라)
      'attached_assets/20250906_143854_1757885367562.jpg',
      'attached_assets/20250906_143918_1757885389570.jpg',
      'attached_assets/bb1_1757722025029.jpg',
      'attached_assets/bible.tgz_1757838970738.aa',
      'attached_assets/bible.tgz_1757839005296.ab',
      
      // PNG 이미지들 (사용자 요청에 따라)
      'chapter_after_random_selection.png',
      'chapter_genesis_1_before_new_chapter.png',
      'chapter_genesis_1_verified.png',
      'font_settings_before_reload.png'
    ];
    
    console.log(`📁 ${coreFiles.length}개 핵심 파일 업로드 시작...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const filePath of coreFiles) {
      try {
        if (!existsSync(filePath)) {
          console.log(`⚠️  파일 없음: ${filePath}`);
          continue;
        }
        
        // 바이너리 파일 체크
        const isBinary = /\.(jpg|jpeg|png|gif|ico|aa|ab|tgz)$/i.test(filePath);
        let content;
        
        if (isBinary) {
          content = readFileSync(filePath).toString('base64');
        } else {
          content = Buffer.from(readFileSync(filePath, 'utf8'), 'utf8').toString('base64');
        }
        
        // 파일 업로드
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: `Add: ${filePath}`,
          content: content
        });
        
        successCount++;
        console.log(`✅ ${filePath}`);
        
      } catch (error) {
        errorCount++;
        console.log(`❌ ${filePath}: ${error.message}`);
      }
    }
    
    // 상세한 README.md 업로드
    const readmeContent = `# Redit HolyTyping 📖✨

한국어 인터페이스를 가진 다국어 성경 타이핑 연습 서비스

## 🎯 프로젝트 개요
**Redit HolyTyping**은 성경 필사를 통한 타이핑 연습과 영성 훈련을 결합한 혁신적인 웹 애플리케이션입니다.

## ✨ 주요 기능
- 📖 **다국어 성경 타이핑**: 한국어, 영어, 중국어, 일본어 지원
- 🏆 **리더보드 & 챌린지**: 개인/교회별 경쟁 시스템
- ⛪ **교회 커뮤니티**: 교회 기반 그룹 활동
- 🔐 **다중 인증**: 소셜 로그인 + 이메일 인증 + 2FA
- 👑 **4단계 관리자 시스템**: 37개 세분화된 권한
- 🎯 **실시간 통계**: 타이핑 속도, 정확도 추적

## 🛠 기술 스택
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth + 소셜 로그인
- **UI**: Tailwind CSS + shadcn/ui

## 🚀 실행 방법
\`\`\`bash
npm install
npm run dev
\`\`\`

## 📱 관리자 시스템
4단계 역할 기반 권한:
- **Super Admin**: 전체 권한 (37개)
- **Content Admin**: 콘텐츠 관리
- **User Admin**: 사용자 관리
- **Stats Viewer**: 통계 조회

### 구현 완료 기능 ✅
- [x] 사용자 인증 시스템 (이메일, 소셜, 2FA)
- [x] 4개 언어 성경 타이핑 시스템
- [x] 실시간 통계 추적
- [x] 교회 커뮤니티 기능
- [x] 4단계 관리자 시스템
- [x] 리더보드 및 순위 시스템
- [x] 모바일 반응형 UI

## 📁 프로젝트 구조
\`\`\`
redit-holytyping/
├── client/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/      # UI 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── hooks/          # 커스텀 훅
│   │   └── lib/            # 유틸리티
├── server/                   # Express 백엔드
├── shared/                   # 공유 타입/스키마
├── migrations/              # 데이터베이스 마이그레이션
└── attached_assets/         # 첨부 파일들
\`\`\`

## 🔒 보안 기능
- **인증**: JWT 대신 서버 세션 사용
- **권한**: 세분화된 RBAC (Role-Based Access Control)
- **로깅**: 관리자 액션 로깅, 민감한 데이터 마스킹
- **검증**: Zod 스키마 기반 입력 검증

---

*Developed with ❤️ for Bible typing practice*

## 📞 연락처
- **GitHub**: https://github.com/waabaa/redit-holytyping
- **이슈 제보**: [GitHub Issues](https://github.com/waabaa/redit-holytyping/issues)
`;

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
        message: 'Update: Comprehensive README documentation',
        content: Buffer.from(readmeContent, 'utf8').toString('base64'),
        sha: existingReadme.sha
      });
      console.log('✅ README.md 업데이트 완료');
    } catch (error) {
      console.log(`❌ README.md 업데이트 실패: ${error.message}`);
    }
    
    // .gitignore 업로드
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/

# Logs
*.log
logs/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store

# Cache
.cache/

# Temporary files
*.tmp
upload-*.js
`;

    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: '.gitignore',
        message: 'Add: .gitignore for project',
        content: Buffer.from(gitignoreContent, 'utf8').toString('base64')
      });
      console.log('✅ .gitignore 생성 완료');
    } catch (error) {
      console.log(`❌ .gitignore 생성 실패: ${error.message}`);
    }
    
    console.log('\\n🎉 핵심 파일 업로드 완료!');
    console.log(`📁 저장소: https://github.com/${owner}/${repo}`);
    console.log(`✅ 성공: ${successCount}개 파일`);
    console.log(`❌ 실패: ${errorCount}개 파일`);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error.message);
  }
}

uploadCoreFiles();