#!/usr/bin/env tsx
/**
 * 빠른 SQLite → PostgreSQL 데이터 이관
 */

import Database from 'sqlite3';
import { db } from '../server/db';
import { languages, translations, bibleBooks, bibleVerses } from '../shared/schema';

const sqliteDb = new Database.Database('../bible_comprehensive.db', Database.OPEN_READONLY);

async function migrateLanguages() {
  console.log('🌍 언어 데이터 이관 중...');
  
  return new Promise<void>((resolve, reject) => {
    sqliteDb.all('SELECT * FROM languages LIMIT 10', async (err, rows: any[]) => {
      if (err) { reject(err); return; }
      
      for (const row of rows) {
        await db.insert(languages).values({
          code: row.code,
          name: row.name,
          encoding: row.encoding || 'utf-8',
          direction: row.direction || 'ltr'
        }).onConflictDoNothing();
      }
      
      console.log(`✅ ${rows.length}개 언어 이관 완료`);
      resolve();
    });
  });
}

async function migrateTranslations() {
  console.log('📖 번역본 데이터 이관 중...');
  
  // 먼저 language IDs 매핑 가져오기
  const languageMap = await db.select().from(languages);
  const langIdMap: { [key: number]: string } = {};
  languageMap.forEach(lang => {
    // SQLite의 language_id와 매핑
    if (lang.code === 'ko') langIdMap[1] = lang.id;
    else if (lang.code === 'en') langIdMap[2] = lang.id;
    else if (lang.code === 'zh_CN') langIdMap[3] = lang.id;
    else if (lang.code === 'ja') langIdMap[4] = lang.id;
    // 기타 언어들...
  });
  
  return new Promise<void>((resolve, reject) => {
    sqliteDb.all('SELECT * FROM translations LIMIT 30', async (err, rows: any[]) => {
      if (err) { reject(err); return; }
      
      for (const row of rows) {
        const languageId = langIdMap[row.language_id] || languageMap[0]?.id;
        if (!languageId) continue;
        
        await db.insert(translations).values({
          code: row.code,
          name: row.name,
          languageId: languageId,
          fullName: row.full_name,
          year: row.year,
          publisher: row.publisher
        }).onConflictDoNothing();
      }
      
      console.log(`✅ ${rows.length}개 번역본 이관 완료`);
      resolve();
    });
  });
}

async function migrateBibleBooks() {
  console.log('📚 성경책 데이터 이관 중...');
  
  return new Promise<void>((resolve, reject) => {
    sqliteDb.all('SELECT * FROM books ORDER BY book_order LIMIT 100', async (err, rows: any[]) => {
      if (err) { reject(err); return; }
      
      for (const row of rows) {
        await db.insert(bibleBooks).values({
          bookCode: row.book_code || `book_${row.id}`,
          bookNameKr: row.book_name_kr || '알 수 없음',
          bookNameEn: row.book_name_en || 'Unknown',
          bookOrder: row.book_order || 999,
          testament: (row.testament || 'OT')?.substring(0, 20),
          chapters: row.chapters || 1,
          verses: row.verses || 1
        }).onConflictDoNothing();
      }
      
      console.log(`✅ ${rows.length}개 성경책 이관 완료`);
      resolve();
    });
  });
}

async function migrateBibleVerses() {
  console.log('📜 성경 구절 데이터 이관 중... (샘플 1000개)');
  
  // 먼저 book IDs와 translation IDs 매핑 가져오기
  const bookMap = await db.select().from(bibleBooks);
  const translationMap = await db.select().from(translations);
  
  const bookIdMap: { [key: string]: string } = {};
  bookMap.forEach(book => {
    if (book.bookCode) bookIdMap[book.bookCode] = book.id;
  });
  
  return new Promise<void>((resolve, reject) => {
    sqliteDb.all('SELECT * FROM verses LIMIT 1000', async (err, rows: any[]) => {
      if (err) { reject(err); return; }
      
      let migrated = 0;
      for (const row of rows) {
        const bookId = bookIdMap[row.book_code];
        const translationId = translationMap[0]?.id; // 기본 번역본 사용
        
        if (!bookId || !translationId) continue;
        
        await db.insert(bibleVerses).values({
          bookId: bookId,
          translationId: translationId,
          languageId: translationMap[0]?.languageId || '',
          bookCode: row.book_code,
          chapter: row.chapter,
          verse: row.verse,
          content: row.content
        }).onConflictDoNothing();
        
        migrated++;
      }
      
      console.log(`✅ ${migrated}개 성경 구절 이관 완료`);
      resolve();
    });
  });
}

async function main() {
  try {
    console.log('🚀 빠른 데이터 이관 시작!');
    
    await migrateLanguages();
    await migrateTranslations();
    await migrateBibleBooks();
    await migrateBibleVerses();
    
    console.log('\n🎉 핵심 데이터 이관 완료!');
    
  } catch (error) {
    console.error('❌ 이관 실패:', error);
  } finally {
    sqliteDb.close();
    process.exit(0);
  }
}

main();