import { getUncachableGitHubClient } from './server/github.js';
import { readFileSync } from 'fs';

async function uploadMainFiles() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'waabaa';
    const repo = 'holynet-bible-typing';
    
    // 주요 파일들만 업로드
    const mainFiles = [
      'package.json',
      'README.md',
      '.gitignore',
      'client/index.html',
      'client/src/App.tsx',
      'client/src/components/header.tsx',
      'server/index.ts',
      'server/routes.ts',
      'server/storage.ts',
      'shared/schema.ts',
      'vite.config.ts',
      'tailwind.config.ts',
      'tsconfig.json'
    ];
    
    // README.md 내용 생성
    const readmeContent = `# 홀리넷 성경필사 (HolyNet Bible Typing)

## 개요
한국어 인터페이스를 가진 다국어 성경 타이핑 연습 서비스입니다. 카카오톡, 네이버, 구글 소셜 로그인과 이메일 인증을 통합한 보안 강화된 인증 시스템과, 세분화된 권한을 가진 통합 관리자 시스템을 제공합니다.

## 주요 기능
- 📖 다국어 성경 타이핑 연습 (한국어, 영어, 중국어, 일본어)
- 🏆 리더보드 및 챌린지 시스템
- ⛪ 교회 커뮤니티 기반 그룹 활동
- 🔐 다중 인증 시스템 (소셜 로그인 + 이메일)
- 👑 4단계 역할 기반 관리자 시스템
- 🎯 실시간 타이핑 통계 및 성과 추적

## 기술 스택
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query

## 관리자 시스템
4단계 역할 기반 권한 시스템:
- **Super Admin**: 모든 권한 (37개 권한)
- **Content Admin**: 콘텐츠 관리
- **User Admin**: 사용자 관리
- **Stats Viewer**: 통계 조회

### 주요 구현 사항
- 세분화된 권한 시스템 (roles.manage, logs.view, 2fa.manage 등)
- 민감한 데이터 로깅 방지 (2FA secret, 백업 코드, 패스워드 등 37개 필드 보호)
- 권한 기반 UI 렌더링
- 관리자 접근 로깅

## 설치 및 실행
\`\`\`bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
\`\`\`

## 환경 변수
\`\`\`
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
\`\`\`

## 데이터베이스 스키마
- **users**: 사용자 정보 및 프로필 완성 상태
- **admin_roles**: 관리자 역할 및 권한
- **churches**: 교회 정보
- **bible_books**: 성경 책 정보 
- **bible_verses**: 성경 구절
- **typing_sessions**: 타이핑 세션 기록
- **challenges**: 챌린지 정보
- **sessions**: 세션 정보

## 라이선스
MIT License

---
Developed with ❤️ for Bible typing practice
`;

    // .gitignore 내용
    const gitignoreContent = `node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
dist/
build/
*.log
.DS_Store
.vscode/
.idea/
*.swp
*.swo
*~
attached_assets/
bible_comprehensive.db*
*.png
upload-to-github.js
simple-upload.js
server/github.js
`;

    console.log('GitHub에 주요 파일들을 업로드합니다...');
    
    // 초기 커밋용 파일 생성
    const filesToUpload = [];
    
    // README.md 추가
    const { data: readmeBlob } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: Buffer.from(readmeContent, 'utf8').toString('base64'),
      encoding: 'base64'
    });
    filesToUpload.push({
      path: 'README.md',
      mode: '100644',
      type: 'blob',
      sha: readmeBlob.sha
    });
    
    // .gitignore 추가
    const { data: gitignoreBlob } = await octokit.rest.git.createBlob({
      owner,
      repo, 
      content: Buffer.from(gitignoreContent, 'utf8').toString('base64'),
      encoding: 'base64'
    });
    filesToUpload.push({
      path: '.gitignore',
      mode: '100644',
      type: 'blob',
      sha: gitignoreBlob.sha
    });
    
    // 기존 파일들 추가
    for (const file of mainFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(content, 'utf8').toString('base64'),
          encoding: 'base64'
        });
        filesToUpload.push({
          path: file,
          mode: '100644',
          type: 'blob', 
          sha: blob.sha
        });
        console.log(`✓ ${file}`);
      } catch (error) {
        console.log(`- ${file} (파일 없음)`);
      }
    }
    
    // 트리 생성
    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: filesToUpload
    });
    
    // 커밋 생성
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: 'Initial commit: 홀리넷 성경필사 - 다국어 성경 타이핑 서비스',
      tree: tree.sha
    });
    
    // main 브랜치 생성/업데이트
    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: 'refs/heads/main',
        sha: commit.sha
      });
    } catch (error) {
      // 브랜치가 이미 존재하는 경우 업데이트
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
        sha: commit.sha
      });
    }
    
    console.log('\\n🎉 GitHub 업로드 완료!');
    console.log(`📁 저장소: https://github.com/${owner}/${repo}`);
    console.log(`📝 커밋: ${commit.sha}`);
    console.log(`\\n추가로 필요한 파일들은 나중에 수동으로 추가하거나 git clone 후 작업하시면 됩니다.`);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error.message);
  }
}

uploadMainFiles();