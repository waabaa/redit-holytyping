#!/usr/bin/env tsx
/**
 * 개역개정(GAEREVIS) 번역본 데이터만 완전 재임포트
 * 오염된 다국어 데이터를 순수 한국어로 교체
 */

import Database from 'sqlite3';
import { db } from '../server/db';
import { languages, translations, bibleBooks, bibleVerses } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const sqliteDb = new Database.Database('../bible_comprehensive.db', Database.OPEN_READONLY);

async function cleanGAEREVISData() {
  console.log('🧹 개역개정 오염 데이터 삭제 중...');
  
  // 개역개정 번역본 ID 확인
  const gaerevisTranslation = await db.select()
    .from(translations)
    .where(eq(translations.code, 'GAEREVIS'))
    .limit(1);
    
  if (!gaerevisTranslation.length) {
    console.error('❌ 개역개정 번역본을 찾을 수 없습니다');
    return;
  }
  
  const translationId = gaerevisTranslation[0].id;
  console.log(`🎯 개역개정 번역본 ID: ${translationId}`);
  
  // 오염된 데이터 완전 삭제
  await db.delete(bibleVerses)
    .where(eq(bibleVerses.translationId, translationId));
    
  console.log(`🗑️ 개역개정 오염 데이터 삭제 완료`);
  return translationId;
}

async function importPureKoreanVerses(translationId: string) {
  console.log('📥 순수 한국어 구절 임포트 중...');
  
  // PostgreSQL 매핑 데이터 가져오기
  const bookMap = await db.select().from(bibleBooks);
  const koreanLanguage = await db.select()
    .from(languages)
    .where(eq(languages.code, 'ko'))
    .limit(1);
    
  if (!koreanLanguage.length) {
    console.error('❌ 한국어 언어를 찾을 수 없습니다');
    return;
  }
  
  const languageId = koreanLanguage[0].id;
  
  // 성경책 코드 매핑
  const bookIdMap: { [key: string]: string } = {};
  bookMap.forEach(book => {
    if (book.bookCode) bookIdMap[book.bookCode] = book.id;
  });
  
  console.log(`📚 매핑된 성경책: ${Object.keys(bookIdMap).length}개`);
  console.log(`🌏 한국어 언어 ID: ${languageId}`);
  
  return new Promise<void>((resolve, reject) => {
    // SQLite에서 순수 한국어 구절만 가져오기
    // 개역개정, 개역성경, 개역한글 등 한국어 번역본만 필터링
    const koreanTranslationCodes = ['GAEREVIS', 'GAE', 'KRV', 'RHV'];
    const query = `
      SELECT DISTINCT b.book_code, v.chapter, v.verse, v.content, t.code as translation_code
      FROM verses v
      INNER JOIN translations t ON v.translation_id = t.id  
      INNER JOIN books b ON v.book_id = b.id
      WHERE t.code IN (${koreanTranslationCodes.map(() => '?').join(',')})
      AND v.content IS NOT NULL 
      AND LENGTH(v.content) > 0
      ORDER BY b.book_code, v.chapter, v.verse
    `;
    
    sqliteDb.all(query, koreanTranslationCodes, async (err, rows: any[]) => {
      if (err) {
        console.error('❌ SQLite 쿼리 실패:', err);
        reject(err);
        return;
      }
      
      console.log(`📊 SQLite에서 발견된 한국어 구절: ${rows.length}개`);
      
      // 개역개정 우선, 그 다음 개역성경, 개역한글 순으로 선택
      const priorityMap: { [key: string]: { [key: string]: any } } = {};
      
      rows.forEach(row => {
        const key = `${row.book_code}-${row.chapter}-${row.verse}`;
        const priority = koreanTranslationCodes.indexOf(row.translation_code);
        
        if (!priorityMap[key] || priority < koreanTranslationCodes.indexOf(priorityMap[key].translation_code)) {
          priorityMap[key] = row;
        }
      });
      
      const uniqueVerses = Object.values(priorityMap);
      console.log(`🎯 중복 제거 후 고유 구절: ${uniqueVerses.length}개`);
      
      // 배치 삽입 (1000개씩)
      const batchSize = 1000;
      let totalInserted = 0;
      
      for (let i = 0; i < uniqueVerses.length; i += batchSize) {
        const batch = uniqueVerses.slice(i, i + batchSize);
        const versesToInsert = [];
        
        for (const row of batch) {
          const bookId = bookIdMap[row.book_code];
          if (!bookId) continue;
          
          // 텍스트가 순수 한국어인지 간단 검증
          const content = row.content.trim();
          if (!content || content.length < 5) continue;
          
          // 라틴 문자나 특수 기호가 너무 많으면 제외 (영어/기타 언어)
          const latinRatio = (content.match(/[a-zA-Z]/g) || []).length / content.length;
          if (latinRatio > 0.3) continue; // 30% 이상 라틴 문자면 제외
          
          versesToInsert.push({
            bookId: bookId,
            translationId: translationId,
            languageId: languageId,
            bookCode: row.book_code,
            chapter: row.chapter || 1,
            verse: row.verse || 1,
            content: content
          });
        }
        
        if (versesToInsert.length > 0) {
          try {
            await db.insert(bibleVerses).values(versesToInsert as any);
            totalInserted += versesToInsert.length;
            console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1}: ${versesToInsert.length}개 삽입 (총 ${totalInserted}개)`);
          } catch (insertErr) {
            console.error('❌ 배치 삽입 실패:', insertErr);
          }
        }
      }
      
      console.log(`🎉 총 ${totalInserted}개 순수 한국어 구절 임포트 완료!`);
      resolve();
    });
  });
}

async function verifyResults(translationId: string) {
  console.log('🔍 결과 검증 중...');
  
  // 마가복음 2장 샘플 확인
  const sampleVerses = await db.select()
    .from(bibleVerses)
    .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
    .where(
      and(
        eq(bibleVerses.translationId, translationId),
        eq(bibleBooks.bookNameKr, '마가복음'),
        eq(bibleVerses.chapter, 2)
      )
    )
    .limit(3);
    
  console.log('📋 검증 샘플 (마가복음 2장):');
  sampleVerses.forEach(row => {
    console.log(`  ${row.bible_verses.verse}절: ${row.bible_verses.content.substring(0, 50)}...`);
  });
  
  // 전체 개수 확인
  const totalCount = await db.select()
    .from(bibleVerses)
    .where(eq(bibleVerses.translationId, translationId));
    
  console.log(`📊 개역개정 총 구절 수: ${totalCount.length}개`);
}

async function main() {
  try {
    console.log('🚀 개역개정 데이터 정화 시작!');
    
    const translationId = await cleanGAEREVISData();
    if (!translationId) return;
    
    await importPureKoreanVerses(translationId);
    await verifyResults(translationId);
    
    console.log('✨ 개역개정 데이터 정화 완료!');
    
  } catch (error) {
    console.error('❌ 정화 작업 실패:', error);
  } finally {
    sqliteDb.close();
    process.exit(0);
  }
}

main();