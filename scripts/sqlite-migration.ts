#!/usr/bin/env tsx

/**
 * SQLite Bible Database Migration Script
 * 
 * 이 스크립트는 SQLite 형태의 성경 데이터베이스를 
 * PostgreSQL로 이관하는 도구입니다.
 */

import Database from 'sqlite3';
import { db } from '../server/db';
import { bibleBooks, bibleVerses, bibleDictionary, hymns } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface SQLiteVerseData {
  [key: string]: any;
}

class BibleMigration {
  private sqliteDb: Database.Database;
  
  constructor(private sqliteFilePath: string) {
    this.sqliteDb = new Database.Database(sqliteFilePath, Database.OPEN_READONLY);
  }

  // SQLite 데이터베이스 스키마 분석
  async analyzeSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔍 SQLite 데이터베이스 스키마 분석 중...');
      
      // 테이블 목록 조회
      this.sqliteDb.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `, (err, tables: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('📊 발견된 테이블들:');
        tables.forEach(table => console.log(`  - ${table.name}`));
        
        // 각 테이블의 구조 분석
        let analyzed = 0;
        tables.forEach(table => {
          this.sqliteDb.all(`PRAGMA table_info(${table.name})`, (err, columns: any[]) => {
            if (err) {
              console.error(`❌ ${table.name} 테이블 분석 실패:`, err);
            } else {
              console.log(`\n📋 ${table.name} 테이블 구조:`);
              columns.forEach(col => {
                console.log(`  - ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''}`);
              });
            }
            
            analyzed++;
            if (analyzed === tables.length) {
              resolve();
            }
          });
        });
      });
    });
  }

  // 샘플 데이터 조회
  async showSampleData(tableName: string, limit: number = 3): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`\n🔎 ${tableName} 테이블 샘플 데이터 (최대 ${limit}개):`);
      
      this.sqliteDb.all(`SELECT * FROM ${tableName} LIMIT ${limit}`, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        rows.forEach((row, index) => {
          console.log(`\n📄 Row ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
        
        resolve();
      });
    });
  }

  // 전체 데이터 개수 확인
  async getDataCounts(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('\n📊 데이터 개수 확인:');
      
      // 성경, 성경사전, 찬송가 테이블명들 확인
      const commonTableNames = [
        // 성경 구절
        'verses', 'verse', 'bible_verses', 'scripture', 
        'books', 'book', 'bible_books',
        'translations', 'versions',
        // 성경사전
        'dictionary', 'bible_dictionary', 'concordance', 'lexicon',
        // 찬송가
        'hymns', 'hymn', 'songs', 'worship_songs', 'hymnbook'
      ];
      
      let checked = 0;
      commonTableNames.forEach(tableName => {
        this.sqliteDb.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result: any) => {
          if (!err && result) {
            console.log(`  ${tableName}: ${result.count}개 레코드`);
          }
          
          checked++;
          if (checked === commonTableNames.length) {
            resolve();
          }
        });
      });
    });
  }

  // 실제 데이터 이관 메서드
  async migrateVerses(sourceTable: string): Promise<number> {
    return new Promise((resolve, reject) => {
      console.log(`\n📖 ${sourceTable} 테이블에서 성경 구절 이관 시작...`);
      
      this.sqliteDb.all(`SELECT * FROM ${sourceTable} LIMIT 10`, async (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`첫 10개 레코드 샘플:`);
        rows.forEach((row, index) => {
          console.log(`\n📄 Row ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}`);
          });
        });

        resolve(rows.length);
      });
    });
  }

  async migrateDictionary(sourceTable: string): Promise<number> {
    return new Promise((resolve, reject) => {
      console.log(`\n📚 ${sourceTable} 테이블에서 성경사전 이관 시작...`);
      
      this.sqliteDb.all(`SELECT * FROM ${sourceTable} LIMIT 5`, async (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`첫 5개 사전 항목 샘플:`);
        rows.forEach((row, index) => {
          console.log(`\n📖 사전 항목 ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${typeof value === 'string' && value.length > 200 ? value.substring(0, 200) + '...' : value}`);
          });
        });

        resolve(rows.length);
      });
    });
  }

  async migrateHymns(sourceTable: string): Promise<number> {
    return new Promise((resolve, reject) => {
      console.log(`\n🎵 ${sourceTable} 테이블에서 찬송가 이관 시작...`);
      
      this.sqliteDb.all(`SELECT * FROM ${sourceTable} LIMIT 5`, async (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`첫 5개 찬송가 샘플:`);
        rows.forEach((row, index) => {
          console.log(`\n🎶 찬송가 ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${typeof value === 'string' && value.length > 150 ? value.substring(0, 150) + '...' : value}`);
          });
        });

        resolve(rows.length);
      });
    });
  }

  // 언어 컬럼 감지
  async detectLanguageColumns(tableName: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(`PRAGMA table_info(${tableName})`, (err, columns: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        const languageColumns = columns
          .map(col => col.name)
          .filter(name => {
            const lowerName = name.toLowerCase();
            return lowerName.includes('korean') || lowerName.includes('kor') || lowerName.includes('ko') ||
                   lowerName.includes('english') || lowerName.includes('eng') || lowerName.includes('en') ||
                   lowerName.includes('chinese') || lowerName.includes('chi') || lowerName.includes('zh') ||
                   lowerName.includes('japanese') || lowerName.includes('jpn') || lowerName.includes('ja') ||
                   lowerName.includes('text') || lowerName.includes('content') || lowerName.includes('verse');
          });
        
        console.log(`\n🌍 ${tableName}에서 발견된 언어 관련 컬럼들:`);
        languageColumns.forEach(col => console.log(`  - ${col}`));
        
        resolve(languageColumns);
      });
    });
  }

  // 데이터베이스 연결 해제
  close(): void {
    this.sqliteDb.close();
  }
}

// 사용법 예시
async function main() {
  const sqliteFilePath = process.argv[2];
  
  if (!sqliteFilePath) {
    console.error('사용법: npx tsx scripts/sqlite-migration.ts <sqlite-file-path>');
    console.error('예시: npx tsx scripts/sqlite-migration.ts bible_data.sqlite');
    process.exit(1);
  }

  console.log(`📖 SQLite 성경 데이터베이스 분석 시작: ${sqliteFilePath}`);
  
  const migration = new BibleMigration(sqliteFilePath);
  
  try {
    await migration.analyzeSchema();
    await migration.getDataCounts();
    
    console.log('\n🔍 테이블별 상세 분석 시작...');
    
    // 성경 구절 테이블들
    const verseTables = ['verses', 'verse', 'bible_verses', 'scripture'];
    for (const table of verseTables) {
      try {
        await migration.showSampleData(table, 3);
        await migration.detectLanguageColumns(table);
        await migration.migrateVerses(table);
      } catch (err) {
        console.log(`⚠️ ${table} 테이블 없음, 건너뜀`);
      }
    }
    
    // 성경사전 테이블들
    const dictionaryTables = ['dictionary', 'bible_dictionary', 'concordance', 'lexicon'];
    for (const table of dictionaryTables) {
      try {
        await migration.showSampleData(table, 2);
        await migration.detectLanguageColumns(table);
        await migration.migrateDictionary(table);
      } catch (err) {
        console.log(`⚠️ ${table} 테이블 없음, 건너뜀`);
      }
    }
    
    // 찬송가 테이블들
    const hymnTables = ['hymns', 'hymn', 'songs', 'worship_songs', 'hymnbook'];
    for (const table of hymnTables) {
      try {
        await migration.showSampleData(table, 2);
        await migration.detectLanguageColumns(table);
        await migration.migrateHymns(table);
      } catch (err) {
        console.log(`⚠️ ${table} 테이블 없음, 건너뜀`);
      }
    }
    
    console.log('\n✅ SQLite 데이터베이스 분석 완료!');
    console.log('\n📋 다음 단계:');
    console.log('1. 위 분석 결과를 바탕으로 데이터 매핑 정의');
    console.log('2. 실제 이관할 테이블명과 컬럼명 확인');
    console.log('3. 배치 단위로 안전하게 PostgreSQL로 이관');
    
  } catch (error) {
    console.error('❌ 분석 중 오류 발생:', error);
  } finally {
    migration.close();
  }
}

// ES Module compatible execution check
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BibleMigration };