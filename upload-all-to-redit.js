import { getUncachableGitHubClient } from './server/github.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// 모든 파일을 재귀적으로 수집 (이번엔 필터링 없이)
function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    // 숨김 파일만 제외 (.git, .gitignore는 나중에 따로 처리)
    if (item.startsWith('.git')) {
      continue;
    }
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
      
      try {
        // 바이너리 파일 체크
        let content;
        let encoding = 'utf8';
        
        // 이미지, DB 파일 등은 base64로 처리
        const isBinary = /\.(png|jpg|jpeg|gif|db|db-shm|db-wal|tgz|aa|ab)$/i.test(item);
        
        if (isBinary) {
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

async function uploadToNewRepository() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'waabaa';
    const repo = 'redit-holytyping';
    
    console.log('📁 파일 수집 시작...');
    const files = getAllFiles('./');
    console.log(`📊 총 ${files.length}개 파일 발견`);
    
    // 파일 크기별로 분류
    const regularFiles = files.filter(f => f.size < 1024 * 1024); // 1MB 미만
    const largeFiles = files.filter(f => f.size >= 1024 * 1024);   // 1MB 이상
    
    if (largeFiles.length > 0) {
      console.log(`⚠️  큰 파일들 (${largeFiles.length}개):`);
      largeFiles.forEach(f => console.log(`   ${f.path} (${Math.round(f.size/1024)}KB)`));
    }
    
    console.log(`✅ 일반 파일: ${regularFiles.length}개`);
    console.log(`⚡ 큰 파일: ${largeFiles.length}개`);
    
    // README.md 추가
    const readmeContent = `# Redit HolyTyping 📖

한국어 인터페이스를 가진 다국어 성경 타이핑 연습 서비스

## 🎯 주요 기능
- 📖 다국어 성경 타이핑 (한/영/중/일)
- 🏆 리더보드 & 챌린지 시스템  
- ⛪ 교회 커뮤니티 기반 활동
- 🔐 다중 인증 (소셜 로그인 + 이메일)
- 👑 4단계 관리자 권한 시스템
- 🎯 실시간 타이핑 통계

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
- Super Admin: 전체 권한 (37개)
- Content Admin: 콘텐츠 관리
- User Admin: 사용자 관리  
- Stats Viewer: 통계 조회

---
Developed with ❤️ for Bible typing practice
`;
    
    regularFiles.push({
      path: 'README.md',
      content: readmeContent,
      encoding: 'utf8',
      size: readmeContent.length
    });
    
    // .gitignore 추가
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

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp

# Cache
.cache/
.parcel-cache/
`;
    
    regularFiles.push({
      path: '.gitignore',
      content: gitignoreContent, 
      encoding: 'utf8',
      size: gitignoreContent.length
    });
    
    console.log('📤 파일 업로드 시작...');
    const fileBlobs = [];
    let uploadCount = 0;
    
    // 모든 파일을 blob으로 변환
    for (const file of regularFiles) {
      try {
        let contentForUpload;
        
        if (file.encoding === 'base64') {
          contentForUpload = file.content.toString('base64');
        } else {
          contentForUpload = Buffer.from(file.content, 'utf8').toString('base64');
        }
        
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: contentForUpload,
          encoding: 'base64'
        });
        
        fileBlobs.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        });
        
        uploadCount++;
        if (uploadCount % 10 === 0) {
          console.log(`📤 진행: ${uploadCount}/${regularFiles.length} (${Math.round(uploadCount/regularFiles.length*100)}%)`);
        }
        
      } catch (error) {
        console.error(`❌ 업로드 실패: ${file.path} - ${error.message}`);
      }
    }
    
    console.log(`✅ ${fileBlobs.length}개 파일 blob 생성 완료`);
    
    // 트리 생성
    console.log('🌳 Git 트리 생성 중...');
    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: fileBlobs
    });
    
    // 커밋 생성
    console.log('📝 커밋 생성 중...');
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: 'Initial commit: Complete Redit HolyTyping project\\n\\n- Full-stack TypeScript Bible typing service\\n- Multi-language support (Korean, English, Chinese, Japanese)\\n- Advanced admin system with 4-tier role permissions\\n- Church community features\\n- Social authentication integration\\n- Real-time typing statistics',
      tree: tree.sha
    });
    
    // main 브랜치 생성
    console.log('🌿 main 브랜치 생성 중...');
    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: 'refs/heads/main',
        sha: commit.sha
      });
    } catch (error) {
      // 이미 존재하는 경우 업데이트
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
        sha: commit.sha
      });
    }
    
    console.log('\\n🎉 업로드 완료!');
    console.log(`📁 저장소: https://github.com/${owner}/${repo}`);
    console.log(`📝 커밋: ${commit.sha.substring(0, 7)}`);
    console.log(`📊 업로드된 파일: ${fileBlobs.length}개`);
    console.log(`📈 총 용량: ${Math.round(files.reduce((acc, f) => acc + f.size, 0) / 1024)}KB`);
    
    if (largeFiles.length > 0) {
      console.log(`\\n⚠️  큰 파일들은 Git LFS가 권장됩니다:`);
      largeFiles.forEach(f => console.log(`   ${f.path}`));
    }
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error.message);
    if (error.response) {
      console.error('응답:', error.response.data);
    }
  }
}

uploadToNewRepository();