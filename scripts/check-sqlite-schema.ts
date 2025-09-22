import Database from 'sqlite3';

const sqliteDb = new Database.Database('../bible_comprehensive.db', Database.OPEN_READONLY);

console.log('🔍 SQLite 데이터베이스 스키마 분석 중...\n');

// 모든 테이블 목록
sqliteDb.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`, (err, tables: any[]) => {
  if (err) {
    console.error('❌ 테이블 목록 조회 실패:', err);
    return;
  }
  
  console.log('📋 테이블 목록:');
  tables.forEach(table => console.log(`  - ${table.name}`));
  
  // books 테이블 구조
  sqliteDb.all(`PRAGMA table_info(books)`, (err, bookColumns: any[]) => {
    if (err) {
      console.error('❌ books 테이블 구조 조회 실패:', err);
    } else {
      console.log('\n📚 books 테이블 구조:');
      bookColumns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
      
      // books 테이블 샘플 데이터
      sqliteDb.all(`SELECT * FROM books LIMIT 5`, (err, bookSamples: any[]) => {
        if (err) {
          console.error('❌ books 샘플 데이터 조회 실패:', err);
        } else {
          console.log('\n📋 books 테이블 샘플:');
          bookSamples.forEach((book, i) => {
            console.log(`${i + 1}. ${Object.entries(book).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
          });
        }
      });
    }
  });
  
  // verses 테이블 구조
  sqliteDb.all(`PRAGMA table_info(verses)`, (err, verseColumns: any[]) => {
    if (err) {
      console.error('❌ verses 테이블 구조 조회 실패:', err);
    } else {
      console.log('\n📖 verses 테이블 구조:');
      verseColumns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
      
      // verses 테이블 샘플 데이터
      sqliteDb.all(`SELECT * FROM verses LIMIT 3`, (err, verseSamples: any[]) => {
        if (err) {
          console.error('❌ verses 샘플 데이터 조회 실패:', err);
        } else {
          console.log('\n📋 verses 테이블 샘플:');
          verseSamples.forEach((verse, i) => {
            console.log(`${i + 1}. ${Object.entries(verse).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
          });
        }
        
        sqliteDb.close();
      });
    }
  });
});