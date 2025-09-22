import Database from 'sqlite3';

const sqliteDb = new Database.Database('./bible_comprehensive.db', Database.OPEN_READONLY);

console.log('🔍 원본 SQLite 데이터베이스 분석 중...\n');

// 총 구절 수
sqliteDb.get('SELECT COUNT(*) as total FROM verses', (err, row: any) => {
  if (err) {
    console.error('❌ 구절 수 조회 실패:', err);
  } else {
    console.log(`📊 총 구절 수: ${row.total.toLocaleString()}개`);
  }
});

// 총 성경책 수
sqliteDb.get('SELECT COUNT(DISTINCT book_id) as total FROM verses', (err, row: any) => {
  if (err) {
    console.error('❌ 성경책 수 조회 실패:', err);
  } else {
    console.log(`📚 구절이 있는 성경책 수: ${row.total}개`);
  }
});

// 성경책별 구절 수 (상위 10개)
sqliteDb.all(`
  SELECT 
    b.name_ko,
    b.book_order, 
    COUNT(v.id) as verse_count
  FROM verses v 
  JOIN books b ON v.book_id = b.id
  GROUP BY v.book_id, b.name_ko, b.book_order
  ORDER BY COUNT(v.id) DESC
  LIMIT 10
`, (err, rows: any[]) => {
  if (err) {
    console.error('❌ 성경책별 구절 수 조회 실패:', err);
  } else {
    console.log('\n📖 구절 수 TOP 10 성경책들:');
    rows.forEach((book, i) => {
      console.log(`${i + 1}. ${book.name_ko} (${book.book_order}): ${book.verse_count.toLocaleString()}구절`);
    });
  }
  
  sqliteDb.close();
});