#!/usr/bin/env tsx

/**
 * 성경 데이터베이스 상세 분석 스크립트
 * 전체 성경 필사 시스템을 위한 완전한 데이터 분석
 */

import Database from 'sqlite3';

interface LanguageInfo {
  id: number;
  code: string;
  name: string;
  encoding: string;
  direction: string;
}

interface TranslationInfo {
  id: number;
  code: string;
  name: string;
  language_id: number;
  full_name: string;
  year: number;
  publisher: string;
}

interface BookInfo {
  id: number;
  book_code: string;
  book_name_kr: string;
  book_name_en: string;
  book_order: number;
  testament: string;
  chapters: number;
  verses: number;
}

class BibleAnalysisDetailed {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database.Database(dbPath, Database.OPEN_READONLY);
  }

  // 언어 정보 분석
  async analyzeLanguages(): Promise<LanguageInfo[]> {
    return new Promise((resolve, reject) => {
      console.log('\n🌍 === 언어 정보 분석 ===');
      
      this.db.all(`SELECT * FROM languages ORDER BY id`, (err, rows: LanguageInfo[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`📊 총 지원 언어: ${rows.length}개`);
        rows.forEach(lang => {
          console.log(`  ${lang.id}. ${lang.name} (${lang.code}) - ${lang.encoding} ${lang.direction}`);
        });

        resolve(rows);
      });
    });
  }

  // 번역본 정보 분석
  async analyzeTranslations(): Promise<TranslationInfo[]> {
    return new Promise((resolve, reject) => {
      console.log('\n📖 === 성경 번역본 분석 ===');
      
      this.db.all(`
        SELECT t.*, l.name as language_name 
        FROM translations t 
        LEFT JOIN languages l ON t.language_id = l.id 
        ORDER BY t.language_id, t.id
      `, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`📚 총 번역본: ${rows.length}개`);
        
        // 언어별로 그룹핑
        const byLanguage = rows.reduce((acc, trans) => {
          const langName = trans.language_name || 'Unknown';
          if (!acc[langName]) acc[langName] = [];
          acc[langName].push(trans);
          return acc;
        }, {} as Record<string, any[]>);

        Object.entries(byLanguage).forEach(([language, translations]: [string, any[]]) => {
          console.log(`\n  🏷️ ${language}:`);
          translations.forEach(trans => {
            console.log(`    • ${trans.name} (${trans.code}) - ${trans.full_name || 'N/A'} ${trans.year || ''}`);
            if (trans.publisher) console.log(`      출판사: ${trans.publisher}`);
          });
        });

        resolve(rows);
      });
    });
  }

  // 성경책 구조 분석
  async analyzeBooks(): Promise<BookInfo[]> {
    return new Promise((resolve, reject) => {
      console.log('\n📚 === 성경책 구조 분석 ===');
      
      this.db.all(`SELECT * FROM books ORDER BY book_order`, (err, rows: BookInfo[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`📖 총 성경책: ${rows.length}권`);
        
        const oldTestament = rows.filter(book => book.testament === 'OT');
        const newTestament = rows.filter(book => book.testament === 'NT');

        console.log(`\n📜 구약성경: ${oldTestament.length}권`);
        oldTestament.slice(0, 10).forEach(book => {
          console.log(`  ${book.book_order}. ${book.book_name_kr} (${book.book_name_en}) - ${book.chapters}장 ${book.verses}절`);
        });
        if (oldTestament.length > 10) {
          console.log(`  ... 외 ${oldTestament.length - 10}권`);
        }

        console.log(`\n📜 신약성경: ${newTestament.length}권`);
        newTestament.slice(0, 10).forEach(book => {
          console.log(`  ${book.book_order}. ${book.book_name_kr} (${book.book_name_en}) - ${book.chapters}장 ${book.verses}절`);
        });
        if (newTestament.length > 10) {
          console.log(`  ... 외 ${newTestament.length - 10}권`);
        }

        // 통계
        const totalChapters = rows.reduce((sum, book) => sum + book.chapters, 0);
        const totalVerses = rows.reduce((sum, book) => sum + book.verses, 0);
        console.log(`\n📊 전체 통계:`);
        console.log(`  총 장(章): ${totalChapters}장`);
        console.log(`  총 절(節): ${totalVerses}절`);

        resolve(rows);
      });
    });
  }

  // 번역본별 구절 수 분석
  async analyzeVersesByTranslation(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('\n📊 === 번역본별 구절 분석 ===');
      
      this.db.all(`
        SELECT 
          t.name as translation_name,
          t.code as translation_code,
          l.name as language_name,
          COUNT(v.id) as verse_count
        FROM translations t
        LEFT JOIN languages l ON t.language_id = l.id
        LEFT JOIN verses v ON t.id = v.translation_id
        GROUP BY t.id, t.name, t.code, l.name
        ORDER BY verse_count DESC
      `, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log('📚 번역본별 구절 수:');
        rows.forEach(row => {
          console.log(`  • ${row.translation_name} (${row.translation_code}) [${row.language_name}]: ${row.verse_count?.toLocaleString() || 0}개 구절`);
        });

        resolve();
      });
    });
  }

  // 샘플 구절 확인
  async analyzeSampleVerses(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('\n📖 === 샘플 구절 확인 ===');
      
      // 창세기 1:1-3 확인 (여러 번역본)
      this.db.all(`
        SELECT 
          v.chapter,
          v.verse,
          v.content,
          t.name as translation,
          t.code as trans_code,
          l.name as language,
          b.book_name_kr
        FROM verses v
        JOIN translations t ON v.translation_id = t.id
        JOIN languages l ON t.language_id = l.id
        JOIN books b ON v.book_id = b.id
        WHERE b.book_name_kr = '창세기' AND v.chapter = 1 AND v.verse <= 3
        ORDER BY l.name, t.name, v.verse
      `, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log('🔍 창세기 1:1-3 샘플 (다국어):');
        
        const byLanguage = rows.reduce((acc, verse) => {
          if (!acc[verse.language]) acc[verse.language] = {};
          if (!acc[verse.language][verse.translation]) acc[verse.language][verse.translation] = [];
          acc[verse.language][verse.translation].push(verse);
          return acc;
        }, {} as any);

        Object.entries(byLanguage).forEach(([language, translations]: [string, any]) => {
          console.log(`\n  🌍 ${language}:`);
          Object.entries(translations).forEach(([translation, verses]: [string, any]) => {
            console.log(`    📖 ${translation}:`);
            verses.forEach((verse: any) => {
              const content = verse.content?.substring(0, 100) + (verse.content?.length > 100 ? '...' : '');
              console.log(`      ${verse.chapter}:${verse.verse} "${content}"`);
            });
          });
        });

        resolve();
      });
    });
  }

  // 데이터 품질 검사
  async checkDataQuality(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('\n🔍 === 데이터 품질 검사 ===');
      
      // 빈 구절 확인
      this.db.get(`
        SELECT COUNT(*) as empty_verses
        FROM verses 
        WHERE content IS NULL OR content = '' OR TRIM(content) = ''
      `, (err, result: any) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`📊 품질 검사 결과:`);
        console.log(`  빈 구절: ${result.empty_verses}개`);
        
        // 평균 구절 길이
        this.db.get(`
          SELECT 
            AVG(LENGTH(content)) as avg_length,
            MIN(LENGTH(content)) as min_length,
            MAX(LENGTH(content)) as max_length
          FROM verses 
          WHERE content IS NOT NULL AND content != ''
        `, (err2, lengthResult: any) => {
          if (err2) {
            reject(err2);
            return;
          }

          console.log(`  평균 구절 길이: ${Math.round(lengthResult.avg_length)}자`);
          console.log(`  최소 구절 길이: ${lengthResult.min_length}자`);
          console.log(`  최대 구절 길이: ${lengthResult.max_length}자`);

          resolve();
        });
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

// 실행
async function runDetailedAnalysis() {
  const analyzer = new BibleAnalysisDetailed('bible_comprehensive.db');
  
  try {
    await analyzer.analyzeLanguages();
    await analyzer.analyzeTranslations();
    await analyzer.analyzeBooks();
    await analyzer.analyzeVersesByTranslation();
    await analyzer.analyzeSampleVerses();
    await analyzer.checkDataQuality();
    
    console.log('\n✅ === 상세 분석 완료 ===');
    console.log('📋 다음 단계: PostgreSQL 이관 계획 수립');
    
  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    analyzer.close();
  }
}

// ES Module compatible execution
import { fileURLToPath } from 'url';
if (import.meta.url === `file://${process.argv[1]}`) {
  runDetailedAnalysis();
}

export { BibleAnalysisDetailed };