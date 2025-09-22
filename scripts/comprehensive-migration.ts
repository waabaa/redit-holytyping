#!/usr/bin/env tsx
/**
 * 포괄적 성경 데이터 마이그레이션
 * 모든 언어, 번역본, 성경책, 구절을 SQLite에서 PostgreSQL로 완전 이관
 */

import Database from 'sqlite3';
import { db } from '../server/db';
import { languages, translations, bibleBooks, bibleVerses } from '../shared/schema';

const sqliteDb = new Database.Database('./bible_comprehensive.db', Database.OPEN_READONLY);

// 1. 언어 이관
async function migrateLanguages() {
  console.log('🌍 언어 데이터 이관 중...');
  
  return new Promise<void>((resolve, reject) => {
    sqliteDb.all('SELECT * FROM languages', async (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`📊 ${rows.length}개 언어 이관 시작`);
      
      for (const row of rows) {
        try {
          await db.insert(languages).values({
            code: row.code,
            name: row.name,
            encoding: row.encoding || 'utf-8',
            direction: row.direction || 'ltr'
          }).onConflictDoNothing();
        } catch (err) {
          console.error(`언어 이관 실패: ${row.name}`, err);
        }
      }
      
      console.log('✅ 언어 이관 완료');
      resolve();
    });
  });
}

// 2. 번역본 이관
async function migrateTranslations() {
  console.log('📖 번역본 데이터 이관 중...');
  
  const pgLanguages = await db.select().from(languages);
  const languageMap: { [key: number]: string } = {};
  pgLanguages.forEach(lang => {
    // SQLite ID를 PostgreSQL ID로 매핑
    const sqliteId = parseInt(lang.id.split('-')[0]) || 1;
    languageMap[sqliteId] = lang.id;
  });
  
  return new Promise<void>((resolve, reject) => {
    sqliteDb.all('SELECT * FROM translations', async (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`📊 ${rows.length}개 번역본 이관 시작`);
      
      for (const row of rows) {
        try {
          const languageId = languageMap[row.language_id] || pgLanguages[0]?.id;
          
          await db.insert(translations).values({
            code: row.code,
            name: row.name,
            languageId: languageId,
            fullName: row.full_name || row.name,
            year: row.year || null,
            publisher: row.publisher || null,
            description: row.description || null
          }).onConflictDoNothing();
        } catch (err) {
          console.error(`번역본 이관 실패: ${row.name}`, err);
        }
      }
      
      console.log('✅ 번역본 이관 완료');
      resolve();
    });
  });
}

// 3. 성경책 이관  
async function migrateBibleBooks() {
  console.log('📚 성경책 데이터 이관 중...');
  
  return new Promise<void>((resolve, reject) => {
    sqliteDb.all('SELECT * FROM books ORDER BY book_order', async (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`📊 ${rows.length}개 성경책 이관 시작`);
      
      for (const row of rows) {
        try {
          await db.insert(bibleBooks).values({
            bookCode: row.book_code,
            bookNameKr: row.book_name_kr || '',
            bookNameEn: row.book_name_en || '',
            bookOrder: row.book_order || 1,
            testament: row.testament || 'old',
            chapters: row.chapters || 1,
            verses: row.verses || 1
          }).onConflictDoNothing();
        } catch (err) {
          console.error(`성경책 이관 실패: ${row.book_name_kr}`, err);
        }
      }
      
      console.log('✅ 성경책 이관 완료');
      resolve();
    });
  });
}

// 4. 구절 이관 (모든 번역본)
async function migrateBibleVerses() {
  console.log('📖 구절 데이터 이관 중...');
  
  // PostgreSQL 매핑 데이터
  const pgBooks = await db.select().from(bibleBooks);
  const pgTranslations = await db.select().from(translations);
  const pgLanguages = await db.select().from(languages);
  
  const bookCodeMap: { [key: string]: string } = {};
  pgBooks.forEach(book => {
    if (book.bookCode) bookCodeMap[book.bookCode] = book.id;
  });
  
  const translationCodeMap: { [key: string]: string } = {};
  pgTranslations.forEach(trans => {
    if (trans.code) translationCodeMap[trans.code] = trans.id;
  });
  
  const defaultLanguage = pgLanguages.find(l => l.code === 'ko') || pgLanguages[0];
  
  console.log(`🔗 매핑 준비: ${Object.keys(bookCodeMap).length}개 성경책, ${Object.keys(translationCodeMap).length}개 번역본`);
  
  return new Promise<void>((resolve, reject) => {
    // 모든 번역본의 구절을 가져오는 쿼리
    const query = `
      SELECT v.*, b.book_code, t.code as translation_code 
      FROM verses v 
      JOIN books b ON v.book_id = b.id 
      JOIN translations t ON v.translation_id = t.id
      WHERE v.content IS NOT NULL AND v.content != ''
      ORDER BY b.book_order, v.chapter, v.verse
    `;
    
    sqliteDb.all(query, async (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`📊 ${rows.length}개 구절 이관 시작`);
      
      let migrated = 0;
      let skipped = 0;
      
      for (const row of rows) {
        if (!row.book_code || !bookCodeMap[row.book_code] || !row.content) {
          skipped++;
          continue;
        }
        
        const translationId = translationCodeMap[row.translation_code] || pgTranslations[0]?.id;
        
        try {
          await db.insert(bibleVerses).values({
            bookId: bookCodeMap[row.book_code],
            translationId: translationId,
            languageId: defaultLanguage?.id || '',
            bookCode: row.book_code,
            chapter: row.chapter || 1,
            verse: row.verse || 1,
            content: row.content.trim()
          }).onConflictDoNothing();
          
          migrated++;
          
          if (migrated % 1000 === 0) {
            console.log(`⏳ ${migrated}개 구절 이관 완료...`);
          }
        } catch (err) {
          skipped++;
          if (skipped < 5) {
            console.error(`구절 이관 실패: ${row.book_code} ${row.chapter}:${row.verse}`, err);
          }
        }
      }
      
      console.log(`✅ 구절 이관 완료: ${migrated}개 성공, ${skipped}개 건너뜀`);
      resolve();
    });
  });
}

// 메인 실행
async function main() {
  try {
    console.log('🚀 포괄적 성경 데이터 마이그레이션 시작!');
    console.log('='.repeat(50));
    
    await migrateLanguages();
    await migrateTranslations();
    await migrateBibleBooks();
    await migrateBibleVerses();
    
    console.log('='.repeat(50));
    console.log('🎉 전체 마이그레이션 완료!');
    
    // 최종 통계
    const finalStats = await db.select().from(bibleVerses);
    console.log(`📊 최종 통계: ${finalStats.length}개 구절 이관됨`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

main();