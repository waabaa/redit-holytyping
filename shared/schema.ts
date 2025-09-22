import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
  boolean,
  unique,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Email verification tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(), // 안전한 랜덤 토큰
  expiresAt: timestamp("expires_at").notNull(), // 24시간 만료
  isUsed: boolean("is_used").default(false), // 토큰 사용 여부
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Performance indexes
  index("idx_email_verification_token").on(table.token),
  index("idx_email_verification_email").on(table.email),
  index("idx_email_verification_expires").on(table.expiresAt),
]);

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(), // 안전한 랜덤 토큰
  expiresAt: timestamp("expires_at").notNull(), // 1시간 만료 (보안상 짧게)
  isUsed: boolean("is_used").default(false), // 토큰 사용 여부
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Performance indexes
  index("idx_password_reset_token").on(table.token),
  index("idx_password_reset_email").on(table.email),
  index("idx_password_reset_expires").on(table.expiresAt),
]);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password", { length: 255 }), // 이메일 인증용 해시된 패스워드
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  age: integer("age"), // 사용자 연령
  region: varchar("region", { length: 100 }), // 사용자 지역 (시/도)
  authProvider: varchar("auth_provider", { length: 50 }), // 소셜 로그인 제공업체 (google, kakao, naver, etc.)
  authProviderId: varchar("auth_provider_id", { length: 255 }), // 소셜 로그인 제공업체별 사용자 ID
  churchId: varchar("church_id"),
  totalWords: integer("total_words").default(0),
  totalAccuracy: real("total_accuracy").default(0),
  averageWpm: real("average_wpm").default(0),
  practiceStreak: integer("practice_streak").default(0),
  totalPoints: integer("total_points").default(0),
  isAdmin: boolean("is_admin").default(false), // 기본 관리자 권한 (하위 호환성)
  // 새로운 관리자 시스템은 adminRoles 테이블을 통해 관리됨
  
  // 추가된 필드들 (새로운 요구사항)
  phone: varchar("phone", { length: 20 }), // 전화번호 저장
  address: text("address"), // 상세 주소 (기존 region과 별도)
  interests: jsonb("interests").$type<string[]>(), // 관심사 배열 (JSON)
  emailVerified: boolean("email_verified").default(false), // 이메일 인증 여부
  phoneVerified: boolean("phone_verified").default(false), // 전화번호 인증 여부
  profileCompleted: boolean("profile_completed").default(false), // 프로필 완성 여부
  privacyConsent: boolean("privacy_consent").default(false), // 개인정보 동의 여부
  marketingConsent: boolean("marketing_consent").default(false), // 마케팅 동의 여부 (선택)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate OAuth accounts
  unique("users_auth_provider_id_unique").on(table.authProvider, table.authProviderId),
]);

// Churches table
export const churches = pgTable("churches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  adminId: varchar("admin_id").notNull(),
  churchCode: varchar("church_code", { length: 8 }).notNull().unique(), // 고유 교회 코드 (예: ABC12345)
  totalMembers: integer("total_members").default(0),
  totalPoints: integer("total_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Performance indexes
  index("idx_churches_code").on(table.churchCode),
  index("idx_churches_admin").on(table.adminId),
  // Foreign key constraint
  foreignKey({
    columns: [table.adminId],
    foreignColumns: [users.id],
  }),
]);

// Languages table
export const languages = pgTable("languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(), // ko, en, zh_CN, etc.
  name: varchar("name", { length: 100 }).notNull(), // Korean, English, etc.
  encoding: varchar("encoding", { length: 20 }), // utf-8, cp949, etc.
  direction: varchar("direction", { length: 3 }).default("ltr"), // ltr or rtl
});

// Bible translations table
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(), // GAE, NIV, KJV, etc.
  name: varchar("name", { length: 200 }).notNull(), // 개역성경, New International Version, etc.
  languageId: varchar("language_id").notNull(), // foreign key to languages
  fullName: varchar("full_name", { length: 300 }), // Full name of translation
  year: integer("year"), // Publication year
  publisher: varchar("publisher", { length: 200 }), // Publisher name
}, (table) => [
  foreignKey({
    columns: [table.languageId],
    foreignColumns: [languages.id],
  }),
]);

// Bible books table
export const bibleBooks = pgTable("bible_books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookCode: varchar("book_code", { length: 20 }).notNull().unique(), // Genesis, Exodus, etc.
  bookNameKr: varchar("book_name_kr", { length: 100 }).notNull(), // 창세기, 출애굽기, etc.
  bookNameEn: varchar("book_name_en", { length: 100 }).notNull(), // Genesis, Exodus, etc.
  bookOrder: integer("book_order").notNull(), // 1, 2, 3, etc.
  testament: varchar("testament", { length: 2 }).notNull(), // OT or NT
  chapters: integer("chapters").notNull(),
  verses: integer("verses").notNull(), // Total verses in this book
});

// Bible verses table
export const bibleVerses = pgTable("bible_verses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull(),
  translationId: varchar("translation_id").notNull(), // foreign key to translations
  languageId: varchar("language_id").notNull(), // foreign key to languages
  bookCode: varchar("book_code"),
  chapter: integer("chapter").notNull(),
  verse: integer("verse").notNull(),
  content: text("content").notNull(), // The actual verse text
}, (table) => [
  // Data integrity: unique constraint to prevent duplicate verses
  unique().on(table.translationId, table.bookId, table.chapter, table.verse),
  // Performance indexes
  index("idx_bible_verses_book_chapter_verse").on(table.bookId, table.chapter, table.verse),
  index("idx_bible_verses_translation").on(table.translationId),
  // Foreign key constraints
  foreignKey({
    columns: [table.bookId],
    foreignColumns: [bibleBooks.id],
  }),
  foreignKey({
    columns: [table.translationId],
    foreignColumns: [translations.id],
  }),
]);

// Bible dictionary table
export const bibleDictionary = pgTable("bible_dictionary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: varchar("word", { length: 200 }).notNull(),
  wordEn: varchar("word_en", { length: 200 }),
  wordKo: varchar("word_ko", { length: 200 }),
  wordZh: varchar("word_zh", { length: 200 }),
  wordJa: varchar("word_ja", { length: 200 }),
  definitionKo: text("definition_ko"),
  definitionEn: text("definition_en"),
  definitionZh: text("definition_zh"),
  definitionJa: text("definition_ja"),
  category: varchar("category", { length: 100 }), // person, place, concept, etc.
  relatedVerses: text("related_verses"), // JSON array of verse references
});

// Hymns table
export const hymns = pgTable("hymns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: integer("number").notNull(), // hymn number
  titleKo: varchar("title_ko", { length: 300 }),
  titleEn: varchar("title_en", { length: 300 }),
  titleZh: varchar("title_zh", { length: 300 }),
  titleJa: varchar("title_ja", { length: 300 }),
  lyricsKo: text("lyrics_ko"),
  lyricsEn: text("lyrics_en"),
  lyricsZh: text("lyrics_zh"),
  lyricsJa: text("lyrics_ja"),
  composer: varchar("composer", { length: 200 }),
  lyricist: varchar("lyricist", { length: 200 }),
  category: varchar("category", { length: 100 }), // worship, praise, prayer, etc.
  key: varchar("key", { length: 10 }), // musical key
  tempo: varchar("tempo", { length: 50 }),
});

// Typing sessions table
export const typingSessions = pgTable("typing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  verseId: varchar("verse_id").notNull(),
  // Removed language field - access through verse -> translation -> language relation
  wpm: real("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  wordsTyped: integer("words_typed").notNull(),
  timeSpent: integer("time_spent").notNull(), // in seconds
  pointsEarned: integer("points_earned").default(0),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  // Foreign key constraints
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  foreignKey({
    columns: [table.verseId],
    foreignColumns: [bibleVerses.id],
  }),
]);

// Challenges table
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // daily, weekly, monthly
  targetVerseIds: text("target_verse_ids"), // JSON array of verse IDs
  requiredAccuracy: real("required_accuracy").default(95),
  requiredWpm: real("required_wpm").default(30),
  pointsReward: integer("points_reward").default(100),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  participantCount: integer("participant_count").default(0),
});

// Challenge participations table
export const challengeParticipations = pgTable("challenge_participations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  challengeId: varchar("challenge_id").notNull(),
  progress: real("progress").default(0), // percentage
  isCompleted: boolean("is_completed").default(false),
  pointsEarned: integer("points_earned").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  unique().on(table.userId, table.challengeId)
]);

// Admin roles table
export const adminRoles = pgTable("admin_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 50 }).notNull(), // super_admin, content_admin, user_admin, stats_viewer
  permissions: jsonb("permissions").$type<string[]>(), // 세부 권한 배열
  grantedBy: varchar("granted_by").notNull(), // 권한을 부여한 관리자 ID
  grantedAt: timestamp("granted_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"), // 권한 만료 시간 (선택사항)
}, (table) => [
  // 한 사용자가 같은 역할을 중복으로 가질 수 없음
  unique().on(table.userId, table.role),
  // Performance indexes
  index("idx_admin_roles_user").on(table.userId),
  index("idx_admin_roles_role").on(table.role),
  // Foreign key constraint
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  foreignKey({
    columns: [table.grantedBy],
    foreignColumns: [users.id],
  }),
]);

// 2FA tokens table
export const twoFactorTokens = pgTable("two_factor_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  secret: varchar("secret", { length: 32 }).notNull(), // TOTP secret
  backupCodes: jsonb("backup_codes").$type<string[]>(), // 백업 코드 배열
  isEnabled: boolean("is_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
}, (table) => [
  // 한 사용자당 하나의 2FA 설정만 허용
  unique().on(table.userId),
  // Performance index
  index("idx_two_factor_user").on(table.userId),
  // Foreign key constraint
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
]);

// Admin access logs table
export const adminAccessLogs = pgTable("admin_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // 수행한 작업
  resource: varchar("resource", { length: 100 }), // 접근한 리소스
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE
  url: text("url").notNull(), // 접근한 URL
  userAgent: text("user_agent"), // 브라우저 정보
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4/IPv6
  success: boolean("success").default(true), // 작업 성공 여부
  errorMessage: text("error_message"), // 오류 메시지 (실패 시)
  requestData: jsonb("request_data"), // 요청 데이터 (민감 정보 제외)
  responseStatus: integer("response_status"), // HTTP 응답 코드
  duration: integer("duration"), // 응답 시간 (ms)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Performance indexes
  index("idx_admin_logs_user").on(table.userId),
  index("idx_admin_logs_action").on(table.action),
  index("idx_admin_logs_created").on(table.createdAt),
  // Foreign key constraint
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  church: one(churches, {
    fields: [users.churchId],
    references: [churches.id],
  }),
  typingSessions: many(typingSessions),
  challengeParticipations: many(challengeParticipations),
  adminRoles: many(adminRoles),
  twoFactorToken: one(twoFactorTokens),
  adminAccessLogs: many(adminAccessLogs),
}));

export const churchesRelations = relations(churches, ({ one, many }) => ({
  admin: one(users, {
    fields: [churches.adminId],
    references: [users.id],
  }),
  members: many(users),
}));

export const languagesRelations = relations(languages, ({ many }) => ({
  translations: many(translations),
}));

export const translationsRelations = relations(translations, ({ one, many }) => ({
  language: one(languages, {
    fields: [translations.languageId],
    references: [languages.id],
  }),
  verses: many(bibleVerses),
}));

export const bibleBooksRelations = relations(bibleBooks, ({ many }) => ({
  verses: many(bibleVerses),
}));

export const bibleVersesRelations = relations(bibleVerses, ({ one, many }) => ({
  book: one(bibleBooks, {
    fields: [bibleVerses.bookId],
    references: [bibleBooks.id],
  }),
  translation: one(translations, {
    fields: [bibleVerses.translationId],
    references: [translations.id],
  }),
  typingSessions: many(typingSessions),
}));

export const typingSessionsRelations = relations(typingSessions, ({ one }) => ({
  user: one(users, {
    fields: [typingSessions.userId],
    references: [users.id],
  }),
  verse: one(bibleVerses, {
    fields: [typingSessions.verseId],
    references: [bibleVerses.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  participations: many(challengeParticipations),
}));

export const challengeParticipationsRelations = relations(challengeParticipations, ({ one }) => ({
  user: one(users, {
    fields: [challengeParticipations.userId],
    references: [users.id],
  }),
  challenge: one(challenges, {
    fields: [challengeParticipations.challengeId],
    references: [challenges.id],
  }),
}));

export const adminRolesRelations = relations(adminRoles, ({ one }) => ({
  user: one(users, {
    fields: [adminRoles.userId],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [adminRoles.grantedBy],
    references: [users.id],
  }),
}));

export const twoFactorTokensRelations = relations(twoFactorTokens, ({ one }) => ({
  user: one(users, {
    fields: [twoFactorTokens.userId],
    references: [users.id],
  }),
}));

export const adminAccessLogsRelations = relations(adminAccessLogs, ({ one }) => ({
  user: one(users, {
    fields: [adminAccessLogs.userId],
    references: [users.id],
  }),
}));

export const bibleDictionaryRelations = relations(bibleDictionary, ({ one }) => ({
  // Dictionary entries are standalone, no direct relations needed
}));

export const hymnsRelations = relations(hymns, ({ one }) => ({
  // Hymns are standalone, no direct relations needed
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SECURITY: Safe user schema for authentication - only allows safe profile fields, no statistics
// NOTE: churchId removed for security - church membership should be managed separately
export const safeAuthUserSchema = createInsertSchema(users).pick({
  id: true,  // Optional for OAuth flow, required for Replit auth
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  age: true,
  region: true,
  authProvider: true,
  authProviderId: true,
  
  // 새로 추가된 필드들 (인증과 프로필 관련)
  phone: true,
  address: true,
  interests: true,
  emailVerified: true,
  phoneVerified: true,
  profileCompleted: true,
  privacyConsent: true,
  marketingConsent: true,
}).partial(); // All fields optional to support flexible OAuth scenarios

export const insertChurchSchema = createInsertSchema(churches).omit({
  id: true,
  createdAt: true,
  totalMembers: true,
  totalPoints: true,
  churchCode: true, // 교회 코드는 서버에서 자동 생성
});

export const insertTypingSessionSchema = createInsertSchema(typingSessions).omit({
  id: true,
  completedAt: true,
});

export const insertChallengeParticipationSchema = createInsertSchema(challengeParticipations).omit({
  id: true,
  joinedAt: true,
  completedAt: true,
});

export const insertBibleDictionarySchema = createInsertSchema(bibleDictionary).omit({
  id: true,
});

export const insertHymnSchema = createInsertSchema(hymns).omit({
  id: true,
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  id: true,
});

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
});

export const insertBibleBookSchema = createInsertSchema(bibleBooks).omit({
  id: true,
});

export const insertBibleVerseSchema = createInsertSchema(bibleVerses).omit({
  id: true,
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
  isUsed: true, // 서버에서 관리
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  isUsed: true, // 서버에서 관리
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type SafeAuthUser = z.infer<typeof safeAuthUserSchema>;
export type Church = typeof churches.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;
export type BibleBook = typeof bibleBooks.$inferSelect;
export type BibleVerse = typeof bibleVerses.$inferSelect;
export type TypingSession = typeof typingSessions.$inferSelect;
export type InsertTypingSession = z.infer<typeof insertTypingSessionSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipation = typeof challengeParticipations.$inferSelect;
export type InsertChallengeParticipation = z.infer<typeof insertChallengeParticipationSchema>;
export type BibleDictionary = typeof bibleDictionary.$inferSelect;
export type InsertBibleDictionary = z.infer<typeof insertBibleDictionarySchema>;
export type Hymn = typeof hymns.$inferSelect;
export type InsertHymn = z.infer<typeof insertHymnSchema>;
export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type InsertBibleBook = z.infer<typeof insertBibleBookSchema>;
export type InsertBibleVerse = z.infer<typeof insertBibleVerseSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Admin types
export type AdminRole = typeof adminRoles.$inferSelect;
export type TwoFactorToken = typeof twoFactorTokens.$inferSelect;
export type AdminAccessLog = typeof adminAccessLogs.$inferSelect;

export const insertAdminRoleSchema = createInsertSchema(adminRoles).omit({
  id: true,
  grantedAt: true,
});

export const insertTwoFactorTokenSchema = createInsertSchema(twoFactorTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertAdminAccessLogSchema = createInsertSchema(adminAccessLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminRole = z.infer<typeof insertAdminRoleSchema>;
export type InsertTwoFactorToken = z.infer<typeof insertTwoFactorTokenSchema>;
export type InsertAdminAccessLog = z.infer<typeof insertAdminAccessLogSchema>;

// Admin permission constants
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  CONTENT_ADMIN: 'content_admin', 
  USER_ADMIN: 'user_admin',
  STATS_VIEWER: 'stats_viewer',
} as const;

export const ADMIN_PERMISSIONS = {
  // User management
  'users.view': '사용자 조회',
  'users.edit': '사용자 정보 수정',
  'users.delete': '사용자 삭제',
  'users.ban': '사용자 정지',
  
  // Content management
  'content.view': '콘텐츠 조회',
  'content.edit': '콘텐츠 수정',
  'content.create': '콘텐츠 생성',
  'content.delete': '콘텐츠 삭제',
  
  // Challenge management
  'challenges.view': '챌린지 조회',
  'challenges.create': '챌린지 생성',
  'challenges.edit': '챌린지 수정',
  'challenges.delete': '챌린지 삭제',
  
  // Church management
  'churches.view': '교회 조회',
  'churches.edit': '교회 정보 수정',
  'churches.create': '교회 등록',
  'churches.delete': '교회 삭제',
  
  // Statistics
  'stats.view': '통계 조회',
  'stats.export': '통계 내보내기',
  
  // System management
  'system.config': '시스템 설정',
  'system.backup': '백업 관리',
  'admin.manage': '관리자 계정 관리',
  'roles.manage': '역할 관리',
  
  // Audit and security
  'logs.view': '접근 로그 조회',
  'settings.manage': '설정 관리',
  '2fa.manage': '2FA 관리',
} as const;

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.keys(ADMIN_PERMISSIONS),
  [ADMIN_ROLES.CONTENT_ADMIN]: [
    'content.view', 'content.edit', 'content.create', 'content.delete',
    'challenges.view', 'challenges.create', 'challenges.edit', 'challenges.delete',
    'stats.view'
  ],
  [ADMIN_ROLES.USER_ADMIN]: [
    'users.view', 'users.edit', 'users.ban',
    'churches.view', 'churches.edit', 'churches.create',
    'stats.view'
  ],
  [ADMIN_ROLES.STATS_VIEWER]: [
    'stats.view', 'stats.export'
  ],
} as const;

export type AdminRoleType = keyof typeof ADMIN_ROLES;
export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;
