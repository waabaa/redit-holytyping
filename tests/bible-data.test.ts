import { describe, test, expect } from 'vitest';
import { db } from '../server/db';
import { bibleBooks, bibleVerses, languages, translations } from '../shared/schema';
import { eq, count } from 'drizzle-orm';

describe('Bible Data Tests', () => {
  test('언어 데이터가 존재해야 함', async () => {
    const languageCount = await db.select({ count: count() }).from(languages);
    expect(languageCount[0].count).toBeGreaterThan(0);
    
    // 한국어 존재 확인
    const koreanLang = await db.select().from(languages).where(eq(languages.code, 'ko'));
    expect(koreanLang.length).toBeGreaterThan(0);
    expect(koreanLang[0].name).toContain('Korean');
  });

  test('번역본 데이터가 존재해야 함', async () => {
    const translationCount = await db.select({ count: count() }).from(translations);
    expect(translationCount[0].count).toBeGreaterThan(0);
    
    // 개역성경 존재 확인
    const gaeTranslation = await db.select().from(translations)
      .where(eq(translations.name, '개역성경'));
    expect(gaeTranslation.length).toBeGreaterThan(0);
  });

  test('성경책 데이터가 존재해야 함', async () => {
    const bookCount = await db.select({ count: count() }).from(bibleBooks);
    expect(bookCount[0].count).toBeGreaterThan(0);
    
    // 창세기 존재 확인
    const genesis = await db.select().from(bibleBooks)
      .where(eq(bibleBooks.bookCode, 'gen'));
    expect(genesis.length).toBeGreaterThan(0);
    expect(genesis[0].bookNameKr).toBe('창세기');
    expect(genesis[0].bookNameEn).toBe('Genesis');
  });

  test('성경 구절 데이터가 존재해야 함', async () => {
    const verseCount = await db.select({ count: count() }).from(bibleVerses);
    expect(verseCount[0].count).toBeGreaterThan(0);
    
    // 창세기 1:1 존재 확인
    const genesis11 = await db.select().from(bibleVerses)
      .where(eq(bibleVerses.bookCode, 'gen'))
      .where(eq(bibleVerses.chapter, 1))
      .where(eq(bibleVerses.verse, 1));
    
    expect(genesis11.length).toBeGreaterThan(0);
    if (genesis11[0]?.content) {
      expect(genesis11[0].content).toContain('태초에');
    }
  });

  test('요한복음 3:16이 존재해야 함', async () => {
    const john316 = await db.select().from(bibleVerses)
      .where(eq(bibleVerses.bookCode, 'joh'))
      .where(eq(bibleVerses.chapter, 3))
      .where(eq(bibleVerses.verse, 16));
    
    expect(john316.length).toBeGreaterThan(0);
    if (john316[0]?.content) {
      expect(john316[0].content).toContain('하나님이 세상을 이처럼 사랑하사');
    }
  });

  test('시편 23편이 존재해야 함', async () => {
    const psalm23 = await db.select().from(bibleVerses)
      .where(eq(bibleVerses.bookCode, 'psa'))
      .where(eq(bibleVerses.chapter, 23));
    
    expect(psalm23.length).toBeGreaterThan(0);
    
    // 시편 23:1 확인
    const psalm23v1 = psalm23.find(v => v.verse === 1);
    expect(psalm23v1).toBeTruthy();
    if (psalm23v1?.content) {
      expect(psalm23v1.content).toContain('여호와는 나의 목자시니');
    }
  });
});