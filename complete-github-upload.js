import { getUncachableGitHubClient } from './server/github.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// 파일 크기별 분류 및 체계적 업로드
async function completeGitHubUpload() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'waabaa';
    const repo = 'redit-holytyping';
    
    console.log('📂 전체 프로젝트 파일 수집 중...');
    
    // 모든 파일 수집 (node_modules, .git 제외)
    function getAllProjectFiles(dir, baseDir = dir) {
      const files = [];
      const items = readdirSync(dir);
      
      for (const item of items) {
        // 제외할 디렉토리들
        if (['node_modules', '.git', '.cache', '.next', 'dist', 'build'].includes(item)) {
          continue;
        }
        
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...getAllProjectFiles(fullPath, baseDir));
        } else {
          const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
          
          try {
            files.push({
              path: relativePath,
              size: stat.size,
              isText: !(/\.(png|jpg|jpeg|gif|ico|db|db-shm|db-wal|tgz|aa|ab|woff|woff2|ttf|eot|pdf|zip|tar|gz|bin)$/i.test(item))
            });
          } catch (error) {
            console.warn(`⚠️  파일 정보 읽기 실패: ${relativePath}`);
          }
        }
      }
      
      return files;
    }
    
    const allFiles = getAllProjectFiles('./');
    console.log(`📊 총 ${allFiles.length}개 프로젝트 파일 발견`);
    
    // 파일 크기별 분류
    const smallFiles = allFiles.filter(f => f.size <= 1024 * 1024); // ≤1MB
    const mediumFiles = allFiles.filter(f => f.size > 1024 * 1024 && f.size <= 100 * 1024 * 1024); // 1MB~100MB
    const largeFiles = allFiles.filter(f => f.size > 100 * 1024 * 1024); // >100MB
    
    console.log(`📋 파일 분류:`);
    console.log(`  • 소형 (≤1MB): ${smallFiles.length}개`);
    console.log(`  • 중형 (1MB~100MB): ${mediumFiles.length}개`);
    console.log(`  • 대형 (>100MB): ${largeFiles.length}개`);
    
    if (largeFiles.length > 0) {
      console.log(`\\n🔥 대형 파일들 (Git LFS 권장):`);
      largeFiles.forEach(f => console.log(`     ${f.path} (${Math.round(f.size/1024/1024)}MB)`));
    }
    
    // 기존 저장소 트리 가져오기 (SHA 정보)
    console.log('\\n📋 기존 저장소 상태 확인...');
    let existingFiles = new Map();
    
    try {
      const { data: tree } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: 'main',
        recursive: true
      });
      
      tree.tree.forEach(item => {
        if (item.type === 'blob') {
          existingFiles.set(item.path, item.sha);
        }
      });
      
      console.log(`✅ 기존 파일 ${existingFiles.size}개 확인`);
    } catch (error) {
      console.log(`⚠️  기존 트리 정보 없음: ${error.message}`);
    }
    
    // 1단계: 소형 파일들 업로드 (Contents API 사용)
    console.log('\\n🚀 1단계: 소형 파일들 업로드 시작...');
    let uploadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 배치 처리 (API 제한 고려)
    const batchSize = 10;
    const smallBatches = [];
    for (let i = 0; i < smallFiles.length; i += batchSize) {
      smallBatches.push(smallFiles.slice(i, i + batchSize));
    }
    
    for (let batchIndex = 0; batchIndex < smallBatches.length; batchIndex++) {
      const batch = smallBatches[batchIndex];
      console.log(`\\n📦 배치 ${batchIndex + 1}/${smallBatches.length} 처리 중... (${batch.length}개 파일)`);
      
      for (const file of batch) {
        try {
          // 파일 내용 읽기
          let content;
          let encoding = 'utf8';
          
          if (file.isText) {
            content = readFileSync(file.path, 'utf8');
          } else {
            content = readFileSync(file.path);
            encoding = 'base64';
          }
          
          // base64로 변환
          const contentBase64 = file.isText 
            ? Buffer.from(content, 'utf8').toString('base64')
            : content.toString('base64');
          
          // 업로드 파라미터
          const uploadParams = {
            owner,
            repo,
            path: file.path,
            message: existingFiles.has(file.path) ? `Update: ${file.path}` : `Add: ${file.path}`,
            content: contentBase64
          };
          
          // 기존 파일이면 SHA 추가
          if (existingFiles.has(file.path)) {
            uploadParams.sha = existingFiles.get(file.path);
          }
          
          // 업로드 실행
          await octokit.rest.repos.createOrUpdateFileContents(uploadParams);
          
          uploadedCount++;
          console.log(`  ✅ ${file.path} (${Math.round(file.size/1024)}KB)`);
          
        } catch (error) {
          errorCount++;
          console.log(`  ❌ ${file.path}: ${error.message}`);
        }
      }
      
      // 배치 간 잠시 대기 (API 제한 방지)
      if (batchIndex < smallBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`\\n📊 1단계 완료 - 소형 파일:`);
    console.log(`  ✅ 성공: ${uploadedCount}개`);
    console.log(`  ❌ 실패: ${errorCount}개`);
    
    // 2단계: 중형 파일들 처리 (Git Data API 사용)
    if (mediumFiles.length > 0) {
      console.log('\\n🚀 2단계: 중형 파일들 업로드 시작...');
      
      for (const file of mediumFiles) {
        try {
          console.log(`\\n📤 처리 중: ${file.path} (${Math.round(file.size/1024/1024)}MB)`);
          
          // 파일 내용을 blob으로 업로드
          const content = readFileSync(file.path);
          const contentBase64 = content.toString('base64');
          
          const { data: blob } = await octokit.rest.git.createBlob({
            owner,
            repo,
            content: contentBase64,
            encoding: 'base64'
          });
          
          console.log(`  ✅ Blob 생성: ${blob.sha.substring(0, 8)}`);
          
          // 현재 main 브랜치의 최신 커밋 가져오기
          const { data: ref } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: 'heads/main'
          });
          
          const latestCommitSha = ref.object.sha;
          
          // 현재 트리 가져오기
          const { data: currentTree } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: latestCommitSha
          });
          
          // 새 트리 항목들 준비
          const treeItems = currentTree.tree.filter(item => item.path !== file.path);
          treeItems.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
          });
          
          // 새 트리 생성
          const { data: newTree } = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: latestCommitSha,
            tree: [{
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: blob.sha
            }]
          });
          
          // 새 커밋 생성
          const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: `Add large file: ${file.path}`,
            tree: newTree.sha,
            parents: [latestCommitSha]
          });
          
          // main 브랜치 업데이트
          await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: 'heads/main',
            sha: newCommit.sha
          });
          
          uploadedCount++;
          console.log(`  ✅ 커밋 완료: ${newCommit.sha.substring(0, 8)}`);
          
        } catch (error) {
          errorCount++;
          console.log(`  ❌ ${file.path}: ${error.message}`);
        }
        
        // 중형 파일 사이 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`\\n📊 2단계 완료 - 중형 파일:`);
      console.log(`  ✅ 성공: ${mediumFiles.filter(f => !f.error).length}개`);
      console.log(`  ❌ 실패: ${mediumFiles.filter(f => f.error).length}개`);
    }
    
    // 3단계: 대형 파일들 안내
    if (largeFiles.length > 0) {
      console.log('\\n⚠️  3단계: 대형 파일 처리 안내');
      console.log('GitHub는 100MB 이상 파일에 대해 Git LFS를 권장합니다.');
      console.log('다음 파일들은 수동으로 처리해주세요:');
      largeFiles.forEach(f => {
        console.log(`  📋 ${f.path} (${Math.round(f.size/1024/1024)}MB)`);
      });
      
      console.log('\\n처리 방법:');
      console.log('1. Git LFS 사용: git lfs track "*.db" && git add . && git commit');
      console.log('2. 파일 분할: 기존 .aa/.ab 파일들처럼 50MB 단위로 분할');
    }
    
    console.log('\\n🎉 GitHub 저장소 업로드 완료!');
    console.log(`📁 저장소: https://github.com/${owner}/${repo}`);
    console.log(`\\n📈 업로드 통계:`);
    console.log(`  총 파일: ${allFiles.length}개`);
    console.log(`  처리된 파일: ${uploadedCount}개`);
    console.log(`  스킵된 파일: ${skippedCount}개`);
    console.log(`  실패한 파일: ${errorCount}개`);
    console.log(`  대형 파일 (수동 처리): ${largeFiles.length}개`);
    
  } catch (error) {
    console.error('❌ 전체 업로드 실패:', error.message);
    if (error.response) {
      console.error('GitHub API 응답:', error.response.data);
    }
  }
}

completeGitHubUpload();