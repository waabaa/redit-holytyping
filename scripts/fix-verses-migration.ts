#!/usr/bin/env tsx
/**
 * 구절 데이터 이관 문제 해결 및 대량 이관
 */

import Database from 'sqlite3';
import { db } from '../server/db';
import { languages, translations, bibleBooks, bibleVerses } from '../shared/schema';

const sqliteDb = new Database.Database('../bible_comprehensive.db', Database.OPEN_READONLY);

async function checkSQLiteVerses() {
  console.log('🔍 SQLite verses 테이블 확인 중...');
  
  return new Promise<void>((resolve, reject) => {
    // 테이블 구조 확인
    sqliteDb.all('PRAGMA table_info(verses)', (err, columns: any[]) => {
      if (err) {
        console.error('❌ verses 테이블 구조 확인 실패:', err);
        reject(err);
        return;
      }
      
      console.log('📋 verses 테이블 컬럼들:');
      columns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
      
      // 데이터 개수 확인
      sqliteDb.get('SELECT COUNT(*) as count FROM verses', (err, result: any) => {
        if (err) {
          console.error('❌ verses 데이터 개수 확인 실패:', err);
          reject(err);
          return;
        }
        
        console.log(`📊 총 구절 개수: ${result.count}`);
        
        // 샘플 데이터 확인
        sqliteDb.all('SELECT * FROM verses LIMIT 3', (err, samples: any[]) => {
          if (err) {
            console.error('❌ 샘플 데이터 확인 실패:', err);
            reject(err);
            return;
          }
          
          console.log('📋 샘플 구절들:');
          samples.forEach((sample, i) => {
            console.log(`${i + 1}. ${sample.book_code} ${sample.chapter}:${sample.verse} - ${sample.content?.substring(0, 50)}...`);
          });
          
          resolve();
        });
      });
    });
  });
}

async function migrateBibleVersesFixed() {
  console.log('📜 구절 데이터 대량 이관 시작...');
  
  // PostgreSQL에서 매핑 데이터 가져오기
  const bookMap = await db.select().from(bibleBooks);
  const translationMap = await db.select().from(translations);
  const languageMap = await db.select().from(languages);
  
  console.log(`📚 성경책 ${bookMap.length}개, 번역본 ${translationMap.length}개, 언어 ${languageMap.length}개 발견`);
  
  // 매핑 테이블 생성
  const bookIdMap: { [key: string]: string } = {};
  bookMap.forEach(book => {
    if (book.bookCode) bookIdMap[book.bookCode] = book.id;
  });
  
  const defaultTranslation = translationMap.find(t => t.code === 'GAE') || translationMap[0];
  const defaultLanguage = languageMap.find(l => l.code === 'ko') || languageMap[0];
  
  if (!defaultTranslation || !defaultLanguage) {
    console.error('❌ 기본 번역본/언어를 찾을 수 없습니다');
    return;
  }
  
  console.log(`✅ 기본 번역본: ${defaultTranslation.name}, 언어: ${defaultLanguage.name}`);
  
  return new Promise<void>((resolve, reject) => {
    // 배치 단위로 처리 (1000개씩)
    const batchSize = 1000;
    let offset = 0;
    let totalMigrated = 0;
    
    const processBatch = async () => {
      sqliteDb.all(
        `SELECT * FROM verses LIMIT ${batchSize} OFFSET ${offset}`,
        async (err, rows: any[]) => {
          if (err) {
            console.error('❌ 배치 처리 실패:', err);
            reject(err);
            return;
          }
          
          if (rows.length === 0) {
            console.log(`🎉 총 ${totalMigrated}개 구절 이관 완료!`);
            resolve();
            return;
          }
          
          let batchMigrated = 0;
          for (const row of rows) {
            const bookId = bookIdMap[row.book_code];
            
            if (!bookId || !row.content) continue;
            
            try {
              await db.insert(bibleVerses).values({
                bookId: bookId,
                translationId: defaultTranslation.id,
                languageId: defaultLanguage.id,
                bookCode: row.book_code,
                chapter: row.chapter || 1,
                verse: row.verse || 1,
                content: row.content
              }).onConflictDoNothing();
              
              batchMigrated++;
            } catch (insertErr) {
              // 개별 오류는 조용히 넘어감
              console.error(`구절 삽입 실패: ${row.book_code} ${row.chapter}:${row.verse}`, insertErr);
            }
          }
          
          totalMigrated += batchMigrated;
          console.log(`✅ 배치 ${Math.floor(offset / batchSize) + 1}: ${batchMigrated}/${rows.length}개 이관 (총 ${totalMigrated}개)`);
          
          offset += batchSize;
          
          // 다음 배치 처리
          setTimeout(processBatch, 100); // 100ms 딜레이로 DB 부하 방지
        }
      );
    };
    
    processBatch();
  });
}

async function main() {
  try {
    console.log('🚀 구절 이관 문제 해결 시작!');
    
    await checkSQLiteVerses();
    await migrateBibleVersesFixed();
    
    // 이관 결과 확인
    const verseCount = await db.select().from(bibleVerses);
    console.log(`\n📊 최종 이관된 구절 수: ${verseCount.length}개`);
    
  } catch (error) {
    console.error('❌ 구절 이관 실패:', error);
  } finally {
    sqliteDb.close();
    process.exit(0);
  }
}

main();