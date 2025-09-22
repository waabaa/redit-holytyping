import { db } from "./db";
import { bibleBooks, bibleVerses, challenges } from "@shared/schema";
import { sampleBibleVerses, getBibleBooks, sampleChallenges } from "../client/src/data/bible-verses";
import { nanoid } from "nanoid";

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // 1. Seed Bible books
    console.log("📚 Seeding Bible books...");
    const books = getBibleBooks();
    
    for (const book of books) {
      await db.insert(bibleBooks).values({
        id: nanoid(),
        name: book.name,
        nameKo: book.nameKo,
        nameEn: book.nameEn,
        nameZh: book.nameZh,
        nameJa: book.nameJa,
        testament: book.testament,
        bookNumber: book.bookNumber,
        chapters: book.chapters
      }).onConflictDoNothing();
    }
    
    console.log(`✅ Seeded ${books.length} Bible books`);

    // 2. Get book IDs for verses
    const bookRecords = await db.select().from(bibleBooks);
    const bookNameToId = new Map();
    bookRecords.forEach(book => {
      bookNameToId.set(book.name, book.id);
    });

    // 3. Seed Bible verses
    console.log("📖 Seeding Bible verses...");
    let verseCount = 0;
    
    for (const verse of sampleBibleVerses) {
      const bookId = bookNameToId.get(verse.book);
      if (bookId) {
        await db.insert(bibleVerses).values({
          id: nanoid(),
          bookId: bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          textKo: verse.textKo,
          textEn: verse.textEn,
          textZh: verse.textZh,
          textJa: verse.textJa,
          version: verse.version || "NIV"
        }).onConflictDoNothing();
        verseCount++;
      }
    }
    
    console.log(`✅ Seeded ${verseCount} Bible verses`);

    // 4. Seed sample challenges
    console.log("🎯 Seeding challenges...");
    
    for (const challenge of sampleChallenges) {
      await db.insert(challenges).values({
        id: nanoid(),
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        targetVerseIds: "[]", // Empty array for now
        requiredAccuracy: challenge.requiredAccuracy,
        requiredWpm: challenge.requiredWpm,
        pointsReward: challenge.pointsReward,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        isActive: challenge.isActive,
        participantCount: challenge.participantCount
      }).onConflictDoNothing();
    }
    
    console.log(`✅ Seeded ${sampleChallenges.length} challenges`);

    console.log("🎉 Database seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedDatabase()
    .then(() => {
      console.log("Seeding finished!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seedDatabase };