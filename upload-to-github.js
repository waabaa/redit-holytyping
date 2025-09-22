import { getUncachableGitHubClient } from './server/github.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// 업로드할 파일들을 재귀적으로 수집
function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    // 제외할 디렉토리/파일들
    if (item.startsWith('.') || 
        item === 'node_modules' || 
        item === 'dist' || 
        item === 'build' ||
        item === 'attached_assets' ||
        item === 'upload-to-github.js') {
      continue;
    }
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push({
        path: relative(baseDir, fullPath).replace(/\\/g, '/'),
        content: readFileSync(fullPath, 'utf8')
      });
    }
  }
  
  return files;
}

async function uploadToGitHub() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'waabaa';
    const repo = 'holynet-bible-typing';
    
    console.log('파일 수집 중...');
    const files = getAllFiles('./');
    console.log(`총 ${files.length}개 파일을 업로드합니다.`);
    
    // README.md 파일 추가
    files.push({
      path: 'README.md',
      content: `# 홀리넷 성경필사 (HolyNet Bible Typing)

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

## 설치 및 실행
\`\`\`bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
\`\`\`

## 환경 변수
필요한 환경 변수들:
- \`DATABASE_URL\`: PostgreSQL 데이터베이스 URL
- \`SESSION_SECRET\`: 세션 암호화 키
- 소셜 로그인 관련 키들 (Google, Kakao, Naver)

## 관리자 시스템
4단계 역할 기반 권한 시스템:
- **Super Admin**: 모든 권한
- **Content Admin**: 콘텐츠 관리
- **User Admin**: 사용자 관리
- **Stats Viewer**: 통계 조회

## 라이선스
MIT License
`
    });
    
    // .gitignore 파일 추가
    files.push({
      path: '.gitignore',
      content: `node_modules/
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
.git/
attached_assets/
upload-to-github.js
server/github.js
`
    });
    
    // 모든 파일을 하나의 커밋으로 업로드
    console.log('파일 업로드 중...');
    
    const fileBlobs = [];
    for (const file of files) {
      try {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content, 'utf8').toString('base64'),
          encoding: 'base64'
        });
        fileBlobs.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        });
        console.log(`✓ ${file.path}`);
      } catch (error) {
        console.error(`✗ ${file.path}: ${error.message}`);
      }
    }
    
    // 트리 생성
    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: fileBlobs
    });
    
    // 커밋 생성
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: 'Initial commit: 홀리넷 성경필사 프로젝트',
      tree: tree.sha
    });
    
    // main 브랜치 업데이트
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: 'refs/heads/main',
      sha: commit.sha
    });
    
    console.log('\\n🎉 GitHub 업로드 완료!');
    console.log(`📁 저장소: https://github.com/${owner}/${repo}`);
    console.log(`📝 커밋: ${commit.sha}`);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error);
  }
}

uploadToGitHub();