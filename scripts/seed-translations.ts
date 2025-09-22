import { db } from "../server/db";
import { languages, translations } from "@shared/schema";
import { nanoid } from "nanoid";

async function seedLanguagesAndTranslations() {
  console.log("🌍 Seeding languages and translations...");

  try {
    // 1. Seed languages
    const languageData = [
      { code: "ko", name: "한국어", encoding: "utf-8", direction: "ltr" },
      { code: "en", name: "English", encoding: "utf-8", direction: "ltr" },
      { code: "zh_CN", name: "中文 (简体)", encoding: "utf-8", direction: "ltr" },
      { code: "ja", name: "日本語", encoding: "utf-8", direction: "ltr" },
    ];

    for (const lang of languageData) {
      await db.insert(languages).values({
        id: nanoid(),
        ...lang,
      }).onConflictDoNothing();
    }

    console.log(`✅ Seeded ${languageData.length} languages`);

    // Get language IDs
    const langRecords = await db.select().from(languages);
    const langCodeToId = new Map();
    langRecords.forEach(lang => {
      langCodeToId.set(lang.code, lang.id);
    });

    // 2. Seed translations
    const translationData = [
      {
        code: "GAE",
        name: "개역개정",
        languageId: langCodeToId.get("ko"),
        fullName: "개역개정 성경",
        year: 1998,
        publisher: "대한성서공회"
      },
      {
        code: "NIV",
        name: "New International Version",
        languageId: langCodeToId.get("en"),
        fullName: "New International Version",
        year: 1978,
        publisher: "Zondervan"
      },
      {
        code: "ESV",
        name: "English Standard Version",
        languageId: langCodeToId.get("en"),
        fullName: "English Standard Version",
        year: 2001,
        publisher: "Crossway"
      },
      {
        code: "CUV",
        name: "和合本",
        languageId: langCodeToId.get("zh_CN"),
        fullName: "新标点和合本",
        year: 1919,
        publisher: "Chinese Union Version"
      }
    ];

    for (const translation of translationData) {
      if (translation.languageId) {
        await db.insert(translations).values({
          id: nanoid(),
          ...translation,
        }).onConflictDoNothing();
      }
    }

    console.log(`✅ Seeded ${translationData.length} translations`);
    console.log("🎉 Language and translation seeding completed!");

  } catch (error) {
    console.error("❌ Error seeding languages and translations:", error);
    throw error;
  }
}

// Only run if called directly (equivalent to require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLanguagesAndTranslations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedLanguagesAndTranslations };