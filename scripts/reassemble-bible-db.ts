#!/usr/bin/env tsx

/**
 * 분할 압축된 성경 데이터베이스 파일을 자동으로 복원하는 스크립트
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';

async function reassembleBibleDatabase() {
  console.log('🔄 분할된 성경 데이터베이스 파일 복원 시작...');

  try {
    // 1. 분할 파일들 찾기
    const files = readdirSync('.').filter(file => 
      file.startsWith('bible_part_') || 
      file.startsWith('bible_comprehensive_part_') ||
      file.startsWith('bible_split_')
    ).sort();

    if (files.length === 0) {
      console.log('❌ 분할 파일을 찾을 수 없습니다.');
      console.log('📋 예상 파일명: bible_part_aa, bible_part_ab, bible_part_ac, ...');
      return;
    }

    console.log(`📁 발견된 분할 파일들 (${files.length}개):`);
    files.forEach(file => console.log(`  - ${file}`));

    // 2. 파일들 합치기
    console.log('\n🔗 분할 파일들 연결 중...');
    const catCommand = `cat ${files.join(' ')} > bible_comprehensive_reassembled.zip`;
    execSync(catCommand);
    
    console.log('✅ 파일 연결 완료!');

    // 3. 압축 해제 시도
    console.log('\n📦 압축 파일 형식 감지 및 해제...');
    
    // ZIP 형식인지 확인
    if (existsSync('bible_comprehensive_reassembled.zip')) {
      try {
        execSync('file bible_comprehensive_reassembled.zip');
        
        // ZIP 파일이면 압축 해제
        try {
          execSync('unzip -o bible_comprehensive_reassembled.zip');
          console.log('✅ ZIP 압축 해제 완료!');
        } catch (zipError) {
          console.log('⚠️ ZIP 해제 실패, 다른 형식 시도...');
          
          // 7z 시도
          try {
            execSync('7z x bible_comprehensive_reassembled.zip');
            console.log('✅ 7z 압축 해제 완료!');
          } catch (sevenZError) {
            console.log('⚠️ 7z 해제 실패, tar.gz 시도...');
            
            // tar.gz 시도
            try {
              execSync('mv bible_comprehensive_reassembled.zip bible_comprehensive_reassembled.tar.gz');
              execSync('tar -xzf bible_comprehensive_reassembled.tar.gz');
              console.log('✅ tar.gz 압축 해제 완료!');
            } catch (tarError) {
              console.log('❌ 알려진 압축 형식으로 해제할 수 없습니다.');
              console.log('📄 연결된 파일: bible_comprehensive_reassembled.zip');
              return;
            }
          }
        }
      } catch (fileError) {
        console.log('⚠️ 파일 형식 확인 실패');
      }
    }

    // 4. SQLite 파일 찾기
    console.log('\n🔍 SQLite 데이터베이스 파일 찾기...');
    const dbFiles = readdirSync('.').filter(file => 
      file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3')
    );

    if (dbFiles.length === 0) {
      console.log('❌ SQLite 데이터베이스 파일을 찾을 수 없습니다.');
      console.log('📁 압축 해제된 파일들:');
      readdirSync('.').forEach(file => {
        if (!file.startsWith('.') && !file.startsWith('node_modules')) {
          console.log(`  - ${file}`);
        }
      });
      return;
    }

    console.log(`📊 발견된 데이터베이스 파일들:`);
    dbFiles.forEach(file => console.log(`  - ${file}`));

    // 5. 가장 큰 DB 파일 또는 bible 이름이 포함된 파일 선택
    let targetDbFile = dbFiles.find(file => 
      file.toLowerCase().includes('bible') || 
      file.toLowerCase().includes('comprehensive')
    ) || dbFiles[0];

    console.log(`\n🎯 분석할 데이터베이스: ${targetDbFile}`);

    // 6. SQLite 분석 스크립트 실행
    console.log('\n🔍 SQLite 데이터베이스 분석 시작...');
    execSync(`npx tsx scripts/sqlite-migration.ts ${targetDbFile}`, { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ 복원 과정 중 오류 발생:', error);
    console.log('\n📋 수동 복원 명령어:');
    console.log('1. cat bible_part_* > bible_comprehensive.zip');
    console.log('2. unzip bible_comprehensive.zip');
    console.log('3. npx tsx scripts/sqlite-migration.ts bible_comprehensive.db');
  }
}

// 즉시 실행
if (require.main === module) {
  reassembleBibleDatabase();
}

export { reassembleBibleDatabase };