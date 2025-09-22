import Database from 'sqlite3';
import { db } from '../server/db';
import { languages, translations, bibleBooks, bibleVerses } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const sqliteDb = new Database.Database('./bible_comprehensive.db', Database.OPEN_READONLY);

async function completeDataMigration() {
  console.log('🚀 완전한 성경 데이터 마이그레이션 시작...\n');

  try {
    // 1. 기존 데이터 정리 (verses만)
    console.log('🧹 기존 구절 데이터 정리 중...');
    await db.delete(bibleVerses);
    console.log('✅ 기존 구절 데이터 삭제 완료');
    
    // 2. 새로운 성경책 데이터 마이그레이션
    console.log('📚 성경책 데이터 마이그레이션 중...');
    
    const booksMigrationPromise = new Promise<{[bookId: number]: string}>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM books ORDER BY book_order', async (err, books: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        const bookIdMap: {[sqliteBookId: number]: string} = {};
        
        // 기존 books 데이터 삭제하고 새로 생성
        await db.delete(bibleBooks);
        
        for (const book of books) {
          const newBookId = nanoid();
          bookIdMap[book.id] = newBookId;
          
          await db.insert(bibleBooks).values({
            id: newBookId,
            bookCode: book.book_code,
            bookNameKr: book.book_name_kr,
            bookNameEn: book.book_name_en,
            bookOrder: book.book_order,
            testament: book.testament || (book.book_order <= 39 ? 'OLD' : 'NEW'),
            chapters: book.chapters || 0,
            verses: book.verses || 0,
          }).onConflictDoNothing();
        }
        
        console.log(`✅ ${books.length}개 성경책 마이그레이션 완료`);
        resolve(bookIdMap);
      });
    });
    
    const bookIdMap = await booksMigrationPromise;
    
    // 3. 기본 언어와 번역본 확인
    const defaultLanguage = await db.select().from(languages).where(eq(languages.code, 'ko')).then(rows => rows[0]);
    const defaultTranslation = await db.select().from(translations).where(eq(translations.code, 'GAEREVIS')).then(rows => rows[0]) ||
                              await db.select().from(translations).where(eq(translations.code, 'GAE')).then(rows => rows[0]) ||
                              await db.select().from(translations).limit(1).then(rows => rows[0]);
                              
    if (!defaultLanguage || !defaultTranslation) {
      throw new Error('기본 언어 또는 번역본을 찾을 수 없습니다.');
    }
    
    console.log(`🌍 기본 언어: ${defaultLanguage.name}`);
    console.log(`📖 기본 번역본: ${defaultTranslation.name}`);
    
    // 4. 구절 데이터 마이그레이션 (배치로 처리)
    console.log('📜 구절 데이터 마이그레이션 시작... (770K+ 구절)');
    
    const versesMigrationPromise = new Promise<void>((resolve, reject) => {
      let offset = 0;
      const batchSize = 5000;
      let totalMigrated = 0;
      
      const migrateBatch = () => {
        sqliteDb.all(`
          SELECT v.*, b.book_code 
          FROM verses v 
          JOIN books b ON v.book_id = b.id 
          LIMIT ${batchSize} OFFSET ${offset}
        `, async (err, verses: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (verses.length === 0) {
            console.log(`🎉 총 ${totalMigrated.toLocaleString()}개 구절 마이그레이션 완료!`);
            resolve();
            return;
          }
          
          // 배치 삽입
          const versesToInsert = verses
            .filter(v => bookIdMap[v.book_id] && v.content)
            .map(verse => ({
              bookId: bookIdMap[verse.book_id],
              translationId: defaultTranslation.id,
              languageId: defaultLanguage.id,
              bookCode: verse.book_code,
              chapter: verse.chapter || 1,
              verse: verse.verse || 1,
              content: verse.content
            }));
          
          if (versesToInsert.length > 0) {
            try {
              await db.insert(bibleVerses).values(versesToInsert);
              totalMigrated += versesToInsert.length;
              
              if (totalMigrated % 10000 === 0) {
                console.log(`📊 진행 상황: ${totalMigrated.toLocaleString()}개 구절 이관 완료...`);
              }
            } catch (insertErr) {
              console.error(`❌ 배치 삽입 실패:`, insertErr);
            }
          }
          
          offset += batchSize;
          
          // 다음 배치 처리
          setTimeout(migrateBatch, 100); // 100ms 딜레이
        });
      };
      
      migrateBatch();
    });
    
    await versesMigrationPromise;
    
    console.log('\n🎉 완전한 성경 데이터 마이그레이션 성공!');
    console.log('📊 최종 결과 확인 중...');
    
    // 최종 결과 확인
    const finalBooks = await db.select().from(bibleBooks);
    const finalVerses = await db.select().from(bibleVerses);
    
    console.log(`📚 총 성경책: ${finalBooks.length}권`);
    console.log(`📜 총 구절: ${finalVerses.length.toLocaleString()}개`);
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    sqliteDb.close();
  }
}

// 실행
completeDataMigration().catch(console.error);