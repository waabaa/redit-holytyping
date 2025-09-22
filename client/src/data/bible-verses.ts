// Sample Bible verses data for initial population
// This should be used to seed the database with actual Bible content

export interface BibleVerseData {
  book: string;
  bookKo: string;
  bookEn: string;
  bookZh?: string;
  bookJa?: string;
  testament: 'OT' | 'NT';
  bookNumber: number;
  chapter: number;
  verse: number;
  textKo: string;
  textEn: string;
  textZh?: string;
  textJa?: string;
  version?: string;
}

export const sampleBibleVerses: BibleVerseData[] = [
  // Genesis
  {
    book: "Genesis",
    bookKo: "창세기",
    bookEn: "Genesis",
    bookZh: "創世記",
    bookJa: "創世記",
    testament: "OT",
    bookNumber: 1,
    chapter: 1,
    verse: 1,
    textKo: "태초에 하나님이 천지를 창조하시니라",
    textEn: "In the beginning God created the heavens and the earth.",
    textZh: "起初，神创造天地。",
    textJa: "はじめに神は天と地とを創造された。",
    version: "NIV"
  },
  {
    book: "Genesis",
    bookKo: "창세기",
    bookEn: "Genesis",
    testament: "OT",
    bookNumber: 1,
    chapter: 1,
    verse: 3,
    textKo: "하나님이 이르시되 빛이 있으라 하시니 빛이 있었고",
    textEn: "And God said, \"Let there be light,\" and there was light.",
    textZh: "神说：要有光，就有了光。",
    textJa: "神は「光あれ」と言われた。すると光があった。",
    version: "NIV"
  },
  
  // Psalms
  {
    book: "Psalms",
    bookKo: "시편",
    bookEn: "Psalms",
    bookZh: "詩篇",
    bookJa: "詩篇",
    testament: "OT",
    bookNumber: 19,
    chapter: 23,
    verse: 1,
    textKo: "여호와는 나의 목자시니 내게 부족함이 없으리로다",
    textEn: "The Lord is my shepherd, I lack nothing.",
    textZh: "耶和华是我的牧者，我必不致缺乏。",
    textJa: "主はわたしの羊飼い、わたしには何も欠けることがない。",
    version: "NIV"
  },
  {
    book: "Psalms",
    bookKo: "시편",
    bookEn: "Psalms",
    testament: "OT",
    bookNumber: 19,
    chapter: 23,
    verse: 2,
    textKo: "그가 나를 푸른 풀밭에 누이시며 쉴 만한 물 가로 인도하시는도다",
    textEn: "He makes me lie down in green pastures, he leads me beside quiet waters,",
    textZh: "他使我躺卧在青草地上，领我在可安歇的水边。",
    textJa: "主はわたしを青草の原に休ませ、憩いの水のほとりに伴い",
    version: "NIV"
  },
  {
    book: "Psalms",
    bookKo: "시편",
    bookEn: "Psalms",
    testament: "OT",
    bookNumber: 19,
    chapter: 23,
    verse: 3,
    textKo: "내 영혼을 소생시키시고 자기 이름을 위하여 의의 길로 인도하시는도다",
    textEn: "he refreshes my soul. He guides me along the right paths for his name's sake.",
    textZh: "他使我的灵魂苏醒，为自己的名引导我走义路。",
    textJa: "魂を生き返らせてくださる。主は御名にふさわしく、わたしを正しい道に導かれる。",
    version: "NIV"
  },

  // John
  {
    book: "John",
    bookKo: "요한복음",
    bookEn: "John",
    bookZh: "約翰福音",
    bookJa: "ヨハネによる福音書",
    testament: "NT",
    bookNumber: 43,
    chapter: 3,
    verse: 16,
    textKo: "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라",
    textEn: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    textZh: "神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不致灭亡，反得永生。",
    textJa: "神は、実に、そのひとり子をお与えになったほどに、世を愛された。それは御子を信じる者が、ひとりとして滅びることなく、永遠のいのちを持つためである。",
    version: "NIV"
  },
  {
    book: "John",
    bookKo: "요한복음",
    bookEn: "John",
    testament: "NT",
    bookNumber: 43,
    chapter: 1,
    verse: 1,
    textKo: "태초에 말씀이 계시니라 이 말씀이 하나님과 함께 계셨으니 이 말씀은 곧 하나님이시니라",
    textEn: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    textZh: "太初有道，道与神同在，道就是神。",
    textJa: "初めに、ことばがあった。ことばは神とともにあった。ことばは神であった。",
    version: "NIV"
  },

  // Matthew
  {
    book: "Matthew",
    bookKo: "마태복음",
    bookEn: "Matthew",
    bookZh: "馬太福音",
    bookJa: "マタイによる福音書",
    testament: "NT",
    bookNumber: 40,
    chapter: 5,
    verse: 3,
    textKo: "심령이 가난한 자는 복이 있나니 천국이 그들의 것임이요",
    textEn: "Blessed are the poor in spirit, for theirs is the kingdom of heaven.",
    textZh: "虚心的人有福了！因为天国是他们的。",
    textJa: "心の貧しい者は幸いです。天の御国はその人たちのものだから。",
    version: "NIV"
  },
  {
    book: "Matthew",
    bookKo: "마태복음",
    bookEn: "Matthew",
    testament: "NT",
    bookNumber: 40,
    chapter: 5,
    verse: 4,
    textKo: "애통하는 자는 복이 있나니 그들이 위로를 받을 것임이요",
    textEn: "Blessed are those who mourn, for they will be comforted.",
    textZh: "哀恸的人有福了！因为他们必得安慰。",
    textJa: "悲しむ者は幸いです。その人たちは慰められるから。",
    version: "NIV"
  },

  // Romans
  {
    book: "Romans",
    bookKo: "로마서",
    bookEn: "Romans",
    bookZh: "羅馬書",
    bookJa: "ローマ人への手紙",
    testament: "NT",
    bookNumber: 45,
    chapter: 8,
    verse: 28,
    textKo: "우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라",
    textEn: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    textZh: "我们晓得万事都互相效力，叫爱神的人得益处，就是按他旨意被召的人。",
    textJa: "神を愛する人々、すなわち、神のご計画に従って召された人々のためには、神がすべてのことを働かせて益としてくださることを、私たちは知っています。",
    version: "NIV"
  },

  // Philippians
  {
    book: "Philippians",
    bookKo: "빌립보서",
    bookEn: "Philippians",
    bookZh: "腓立比書",
    bookJa: "ピリピ人への手紙",
    testament: "NT",
    bookNumber: 50,
    chapter: 4,
    verse: 13,
    textKo: "내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라",
    textEn: "I can do all this through him who gives me strength.",
    textZh: "我靠着那加给我力量的，凡事都能做。",
    textJa: "私は、私を強くしてくださる方によって、どんなことでもできるのです。",
    version: "NIV"
  },

  // Proverbs
  {
    book: "Proverbs",
    bookKo: "잠언",
    bookEn: "Proverbs",
    bookZh: "箴言",
    bookJa: "箴言",
    testament: "OT",
    bookNumber: 20,
    chapter: 3,
    verse: 5,
    textKo: "너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라",
    textEn: "Trust in the Lord with all your heart and lean not on your own understanding;",
    textZh: "你要专心仰赖耶和华，不可倚靠自己的聪明，",
    textJa: "心を尽くして主に拠り頼め。自分の悟りにたよるな。",
    version: "NIV"
  },
  {
    book: "Proverbs",
    bookKo: "잠언",
    bookEn: "Proverbs",
    testament: "OT",
    bookNumber: 20,
    chapter: 3,
    verse: 6,
    textKo: "너는 범사에 그를 인정하라 그리하면 네 길을 지도하시리라",
    textEn: "in all your ways submit to him, and he will make your paths straight.",
    textZh: "在你一切所行的事上都要认定他，他必指引你的路。",
    textJa: "あなたの行く所どこにおいても、主を認めよ。そうすれば、主があなたの道をまっすぐにされる。",
    version: "NIV"
  },

  // Isaiah
  {
    book: "Isaiah",
    bookKo: "이사야",
    bookEn: "Isaiah",
    bookZh: "以賽亞書",
    bookJa: "イザヤ書",
    testament: "OT",
    bookNumber: 23,
    chapter: 40,
    verse: 31,
    textKo: "오직 여호와를 앙망하는 자는 새 힘을 얻으리니 독수리가 날개치며 올라감 같을 것이요 달음박질하여도 곤비하지 아니하며 걸어가도 피곤하지 아니하리로다",
    textEn: "but those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    textZh: "但那等候耶和华的必从新得力。他们必如鹰展翅上腾；他们奔跑却不困倦，行走却不疲乏。",
    textJa: "しかし、主を待ち望む者は新しく力を得、鷲のように翼をかって上ることができる。走ってもたゆまず、歩いても疲れない。",
    version: "NIV"
  }
];

// Helper function to get unique books from the sample data
export const getBibleBooks = () => {
  const books = new Map();
  
  sampleBibleVerses.forEach(verse => {
    if (!books.has(verse.book)) {
      books.set(verse.book, {
        name: verse.book,
        nameKo: verse.bookKo,
        nameEn: verse.bookEn,
        nameZh: verse.bookZh,
        nameJa: verse.bookJa,
        testament: verse.testament,
        bookNumber: verse.bookNumber,
        chapters: 1 // This would need to be calculated properly
      });
    }
    
    // Update chapter count if this verse has a higher chapter number
    const book = books.get(verse.book);
    if (verse.chapter > book.chapters) {
      book.chapters = verse.chapter;
    }
  });
  
  return Array.from(books.values()).sort((a, b) => a.bookNumber - b.bookNumber);
};

// Helper function to create sample challenges
export const sampleChallenges = [
  {
    title: "오늘의 말씀",
    description: "매일 새로운 성경 구절을 필사하며 하나님의 말씀을 마음에 새겨보세요",
    type: "daily",
    requiredAccuracy: 95,
    requiredWpm: 30,
    pointsReward: 50,
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    isActive: true,
    participantCount: 1234
  },
  {
    title: "시편 23편 완주",
    description: "다윗의 시편 23편 전체를 일주일 동안 완성해보세요",
    type: "weekly",
    requiredAccuracy: 90,
    requiredWpm: 25,
    pointsReward: 200,
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    isActive: true,
    participantCount: 856
  },
  {
    title: "사랑의 장 마라톤",
    description: "고린도전서 13장 사랑 장을 한 달 동안 완벽히 암송해보세요",
    type: "monthly",
    requiredAccuracy: 98,
    requiredWpm: 35,
    pointsReward: 1000,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
    isActive: true,
    participantCount: 2341
  }
];
