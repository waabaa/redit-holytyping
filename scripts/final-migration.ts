#!/usr/bin/env tsx
/**
 * 최종 구절 이관 - JOIN으로 book_code 매핑
 */

import Database from 'sqlite3';
import { db } from '../server/db';
import { languages, translations, bibleBooks, bibleVerses } from '../shared/schema';

const sqliteDb = new Database.Database('./bible_comprehensive.db', Database.OPEN_READONLY);

async function migrateVersesWithJoin() {
  console.log('🚀 JOIN으로 구절 데이터 대량 이관 시작!');
  
  // PostgreSQL 매핑 데이터
  const bookMap = await db.select().from(bibleBooks);
  const translationMap = await db.select().from(translations);
  const languageMap = await db.select().from(languages);
  
  const bookIdMap: { [key: string]: string } = {};
  bookMap.forEach(book => {
    if (book.bookCode) bookIdMap[book.bookCode] = book.id;
  });
  
  const defaultTranslation = translationMap.find(t => t.code === 'GAE') || translationMap[0];
  const defaultLanguage = languageMap.find(l => l.code === 'ko') || languageMap[0];
  
  console.log(`✅ 기본 번역본: ${defaultTranslation?.name}, 언어: ${defaultLanguage?.name}`);
  console.log(`📚 매핑 가능한 성경책: ${Object.keys(bookIdMap).length}개`);
  
  return new Promise<void>((resolve, reject) => {
    // JOIN 쿼리로 book_code 가져오기
    const joinQuery = `
      SELECT v.*, b.book_code 
      FROM verses v 
      JOIN books b ON v.book_id = b.id 
      LIMIT 50000
    `;
    
    sqliteDb.all(joinQuery, async (err, rows: any[]) => {
      if (err) {
        console.error('❌ JOIN 쿼리 실패:', err);
        reject(err);
        return;
      }
      
      console.log(`📊 JOIN 결과: ${rows.length}개 구절 (book_code 포함)`);
      
      // 첫 3개 샘플 확인
      console.log('📋 샘플 구절들:');
      rows.slice(0, 3).forEach((sample, i) => {
        console.log(`${i + 1}. ${sample.book_code} ${sample.chapter}:${sample.verse} - ${sample.content?.substring(0, 50)}...`);
      });
      
      let migrated = 0;
      for (const row of rows) {
        if (!row.book_code || !bookIdMap[row.book_code] || !row.content) continue;
        
        try {
          await db.insert(bibleVerses).values({
            bookId: bookIdMap[row.book_code],
            translationId: defaultTranslation!.id,
            languageId: defaultLanguage!.id,
            bookCode: row.book_code,
            chapter: row.chapter || 1,
            verse: row.verse || 1,
            content: row.content
          }).onConflictDoNothing();
          
          migrated++;
        } catch (insertErr) {
          if (migrated < 5) {
            console.error(`구절 삽입 실패: ${row.book_code} ${row.chapter}:${row.verse}`, insertErr);
          }
        }
      }
      
      console.log(`🎉 ${migrated}개 구절 이관 완료!`);
      resolve();
    });
  });
}

async function main() {
  try {
    await migrateVersesWithJoin();
    
    // 결과 확인
    const verseCount = await db.select().from(bibleVerses);
    console.log(`\n📊 최종 이관된 구절 수: ${verseCount.length}개`);
    
    // 샘플 구절 확인
    const sampleVerses = verseCount.slice(0, 3);
    console.log('\n📋 이관된 구절 샘플:');
    sampleVerses.forEach((verse, i) => {
      console.log(`${i + 1}. ${verse.bookCode} ${verse.chapter}:${verse.verse} - ${verse.content?.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('❌ 이관 실패:', error);
  } finally {
    sqliteDb.close();
    process.exit(0);
  }
}

main();