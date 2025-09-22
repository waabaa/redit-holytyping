import {
  users,
  churches,
  bibleBooks,
  bibleVerses,
  languages,
  translations,
  typingSessions,
  challenges,
  challengeParticipations,
  emailVerificationTokens,
  passwordResetTokens,
  adminRoles,
  twoFactorTokens,
  adminAccessLogs,
  safeAuthUserSchema,
  type User,
  type UpsertUser,
  type SafeAuthUser,
  type Church,
  type InsertChurch,
  type BibleBook,
  type BibleVerse,
  type Language,
  type Translation,
  type TypingSession,
  type InsertTypingSession,
  type Challenge,
  type ChallengeParticipation,
  type InsertChallengeParticipation,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type AdminRole,
  type InsertAdminRole,
  type TwoFactorToken,
  type InsertTwoFactorToken,
  type AdminAccessLog,
  type InsertAdminAccessLog,
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  type AdminRoleType,
  type AdminPermission,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, gte, lte, avg, sum, count, isNull } from "drizzle-orm";
import { cache, TTL } from "./cache";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  
  // SECURITY: Safe authentication function - only allows profile fields, no statistics
  safeUpsertUserFromAuth(user: SafeAuthUser): Promise<User>;
  
  // Profile update operations
  updateUserProfile(userId: string, profileData: { firstName?: string; age?: number; region?: string; churchId?: string | null; profileCompleted?: boolean }): Promise<User>;
  
  // OAuth preparation: Backfill authProvider/authProviderId for existing Replit users
  backfillReplitAuthInfo(): Promise<{ updatedCount: number; errors: string[] }>;
  
  // DEPRECATED: Use with caution - allows all fields including statistics
  // Only for internal server use, NOT for client-facing operations
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Church operations
  createChurch(church: InsertChurch): Promise<Church>;
  getChurch(id: string): Promise<Church | undefined>;
  getChurchByCode(churchCode: string): Promise<Church | undefined>;
  getAllChurches(search?: string, limit?: number): Promise<Church[]>;
  getUserChurch(userId: string): Promise<Church | undefined>;
  getChurchMembers(churchId: string): Promise<Array<User & { isAdmin: boolean }>>;
  joinChurch(userId: string, churchId: string): Promise<{ success: boolean; message: string }>;
  joinChurchByCode(userId: string, churchCode: string): Promise<{ success: boolean; message: string }>;
  updateChurch(churchId: string, updateData: Partial<Pick<Church, 'name' | 'description'>>): Promise<Church>;
  getChurchLeaderboard(limit?: number): Promise<Array<Church & { averageWpm: number; memberCount: number }>>;
  
  // Bible operations
  getBibleBooks(): Promise<BibleBook[]>;
  getBibleVerse(bookId: string, chapter: number, verse: number, translationId?: string): Promise<BibleVerse | undefined>;
  getRandomVerse(translationId?: string): Promise<BibleVerse | undefined>;
  getChapterVerses(bookId: string, chapter: number, translationId?: string): Promise<BibleVerse[]>;
  
  // Language and translation operations
  getLanguages(): Promise<Language[]>;
  getTranslationsByLanguage(languageCode: string): Promise<Translation[]>;
  getDefaultTranslation(): Promise<Translation | undefined>;
  getMaxChapterForBook(bookId: string, translationId?: string): Promise<number>;
  
  // Typing session operations
  createTypingSession(session: InsertTypingSession): Promise<TypingSession>;
  getUserTypingSessions(userId: string, limit?: number): Promise<TypingSession[]>;
  getUserStats(userId: string): Promise<{
    totalWords: number;
    averageWpm: number;
    averageAccuracy: number;
    totalSessions: number;
  }>;
  updateUserStats(userId: string): Promise<void>;
  
  // Leaderboard operations
  getPersonalLeaderboard(limit?: number): Promise<Array<User & { churchName: string | null }>>;
  
  // Enhanced leaderboard operations
  getGlobalLeaderboard(
    sortBy?: 'totalPoints' | 'averageWpm' | 'totalAccuracy', 
    timeRange?: 'daily' | 'weekly' | 'monthly' | 'all',
    limit?: number, 
    offset?: number
  ): Promise<{
    users: Array<User & { 
      churchName: string | null; 
      rank: number;
      recentSessions?: number;
    }>;
    total: number;
  }>;
  
  getChurchMemberLeaderboard(
    churchId: string, 
    sortBy?: 'totalPoints' | 'averageWpm' | 'totalAccuracy',
    limit?: number,
    offset?: number
  ): Promise<{
    users: Array<User & { rank: number }>;
    total: number;
    churchInfo: Church;
  }>;
  
  getUserRankInfo(userId: string): Promise<{
    globalRank: number;
    churchRank: number | null;
    totalUsers: number;
    totalChurchMembers: number | null;
    percentile: number;
    churchPercentile: number | null;
  }>;
  
  getEnhancedChurchLeaderboard(
    sortBy?: 'totalPoints' | 'averageWpm' | 'memberCount',
    limit?: number,
    offset?: number
  ): Promise<{
    churches: Array<Church & { 
      averageWpm: number; 
      memberCount: number;
      totalPoints: number;
      rank: number;
      activeMembers: number;
    }>;
    total: number;
  }>;
  
  // Challenge operations
  getActiveChallenges(): Promise<Challenge[]>;
  joinChallenge(participation: InsertChallengeParticipation): Promise<ChallengeParticipation>;
  getUserChallengeProgress(userId: string, challengeId: string): Promise<ChallengeParticipation | undefined>;
  updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<void>;
  getUserActiveChallengeParticipations(userId: string): Promise<Array<ChallengeParticipation & { challenge: Challenge }>>;
  updateChallengesAfterSession(userId: string, session: TypingSession): Promise<void>;

  // Dashboard operations
  getUserDashboard(userId: string): Promise<{
    user: User;
    stats: {
      totalWords: number;
      averageWpm: number;
      averageAccuracy: number;
      totalSessions: number;
      practiceStreak: number;
      totalPoints: number;
    };
    rankings: {
      globalRank: number;
      churchRank: number | null;
      totalUsers: number;
      percentile: number;
    };
    recentSessions: TypingSession[];
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      unlockedAt: Date | null;
      progress: number;
      total: number;
    }>;
    weeklyProgress: Array<{
      date: string;
      sessions: number;
      wordsTyped: number;
      avgWpm: number;
    }>;
  }>;
  
  getUserRecentSessions(userId: string, limit?: number): Promise<Array<TypingSession & {
    bookName: string;
    chapter: number;
    verse: number;
  }>>;
  
  getUserProgress(userId: string): Promise<{
    bibleProgress: Array<{
      bookId: string;
      bookName: string;
      chaptersCompleted: number;
      totalChapters: number;
      progressPercentage: number;
    }>;
    dailyGoal: {
      targetSessions: number;
      targetWords: number;
      currentSessions: number;
      currentWords: number;
    };
    weeklyGoal: {
      targetSessions: number;
      targetWords: number;
      currentSessions: number;
      currentWords: number;
    };
  }>;
  
  getUserAchievements(userId: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'typing' | 'speed' | 'accuracy' | 'streak' | 'bible';
    unlockedAt: Date | null;
    progress: number;
    total: number;
    isUnlocked: boolean;
  }>>;

  // Admin operations
  getAdminStats(): Promise<{
    totalUsers: number;
    totalChurches: number;
    totalTypingSessions: number;
    averageWpm: number;
    averageAccuracy: number;
    newUsersThisWeek: number;
    activeUsersToday: number;
    usersByAge: Array<{ ageRange: string; count: number }>;
    usersByRegion: Array<{ region: string; count: number }>;
    churchMemberStats: Array<{ churchName: string; memberCount: number; averageWpm: number }>;
    recentActivity: Array<{ date: string; sessions: number; newUsers: number }>;
  }>;
  makeUserAdmin(userId: string): Promise<{ success: boolean; message: string }>;
  removeUserAdmin(userId: string): Promise<{ success: boolean; message: string }>;

  // Email authentication operations
  createEmailUser(email: string, hashedPassword: string, firstName: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  verifyUserPassword(email: string, password: string): Promise<User | undefined>;
  createVerificationToken(email: string, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  activateUserEmail(email: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;
  
  // Password reset operations
  createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  updateUserPassword(email: string, hashedPassword: string): Promise<void>;
  cleanupExpiredPasswordResetTokens(): Promise<void>;
  
  // Enhanced admin operations
  createAdminRole(roleData: InsertAdminRole): Promise<AdminRole>;
  getUserAdminRoles(userId: string): Promise<AdminRole[]>;
  removeAdminRole(userId: string, role: string): Promise<void>;
  checkAdminPermission(userId: string, permission: AdminPermission): Promise<boolean>;
  checkAdminRole(userId: string, role: AdminRoleType): Promise<boolean>;
  getAllAdminUsers(): Promise<Array<User & { roles: AdminRole[] }>>;
  
  // 2FA operations
  createTwoFactorToken(userId: string, secret: string, backupCodes: string[]): Promise<TwoFactorToken>;
  getTwoFactorToken(userId: string): Promise<TwoFactorToken | undefined>;
  enableTwoFactorAuth(userId: string): Promise<void>;
  disableTwoFactorAuth(userId: string): Promise<void>;
  verifyTwoFactorToken(userId: string, token: string): Promise<boolean>;
  useTwoFactorBackupCode(userId: string, code: string): Promise<boolean>;
  
  // Admin access logging
  logAdminAccess(logData: InsertAdminAccessLog): Promise<AdminAccessLog>;
  getAdminAccessLogs(userId?: string, limit?: number, offset?: number): Promise<{
    logs: AdminAccessLog[];
    total: number;
  }>;
  getAdminActionStats(timeRange?: 'daily' | 'weekly' | 'monthly'): Promise<Array<{
    action: string;
    count: number;
    successRate: number;
  }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // SECURITY: Safe authentication upsert - supports OAuth composite key scenarios
  async safeUpsertUserFromAuth(userData: SafeAuthUser): Promise<User> {
    // Runtime validation to enforce schema constraints
    const validatedData = safeAuthUserSchema.parse(userData);
    
    return await db.transaction(async (tx) => {
      let existingUser: User | undefined;
      
      // Strategy 1: Find by composite OAuth key (authProvider + authProviderId)
      if (validatedData.authProvider && validatedData.authProviderId) {
        const [foundUser] = await tx
          .select()
          .from(users)
          .where(
            and(
              eq(users.authProvider, validatedData.authProvider),
              eq(users.authProviderId, validatedData.authProviderId)
            )
          )
          .limit(1);
        existingUser = foundUser;
      }
      
      // Strategy 2: Fallback to ID lookup for Replit auth (when OAuth info not available)
      if (!existingUser && validatedData.id) {
        const [foundUser] = await tx
          .select()
          .from(users)
          .where(eq(users.id, validatedData.id))
          .limit(1);
        existingUser = foundUser;
      }
      
      // Prepare safe data for upsert (exclude churchId for security)
      const safeFields = {
        id: validatedData.id,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        profileImageUrl: validatedData.profileImageUrl,
        age: validatedData.age,
        region: validatedData.region,
        authProvider: validatedData.authProvider,
        authProviderId: validatedData.authProviderId,
        updatedAt: new Date(),
      };
      
      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(safeFields).filter(([_, value]) => value !== undefined)
      );
      
      if (existingUser) {
        // Update existing user
        const [updatedUser] = await tx
          .update(users)
          .set(cleanData)
          .where(eq(users.id, existingUser.id))
          .returning();
        return updatedUser;
      } else {
        // Create new user
        const [newUser] = await tx
          .insert(users)
          .values(cleanData)
          .returning();
        return newUser;
      }
    });
  }

  // OAuth preparation: Backfill authProvider/authProviderId for existing Replit users
  async backfillReplitAuthInfo(): Promise<{ updatedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let updatedCount = 0;
    
    try {
      // Find users who don't have authProvider/authProviderId set (existing Replit users)
      const usersToUpdate = await db
        .select({ id: users.id })
        .from(users)
        .where(
          or(
            isNull(users.authProvider),
            isNull(users.authProviderId)
          )
        );
      
      console.log(`Found ${usersToUpdate.length} users to backfill with Replit auth info`);
      
      // Update users in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < usersToUpdate.length; i += batchSize) {
        const batch = usersToUpdate.slice(i, i + batchSize);
        
        try {
          await db.transaction(async (tx) => {
            for (const user of batch) {
              await tx
                .update(users)
                .set({
                  authProvider: 'replit',
                  authProviderId: user.id, // Use the user's ID as the provider ID for Replit
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));
              updatedCount++;
            }
          });
          
          console.log(`Backfilled batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(usersToUpdate.length / batchSize)}`);
        } catch (batchError) {
          const errorMsg = `Failed to update batch starting at index ${i}: ${batchError instanceof Error ? batchError.message : String(batchError)}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      console.log(`✅ Backfill completed: ${updatedCount} users updated with Replit auth info`);
      
    } catch (error) {
      const errorMsg = `Failed to backfill Replit auth info: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
    
    return { updatedCount, errors };
  }

  // Profile update operations - safe for client use
  async updateUserProfile(userId: string, profileData: { firstName?: string; age?: number; region?: string; churchId?: string | null; profileCompleted?: boolean }): Promise<User> {
    // Only allow safe profile fields
    const safeProfileData: any = {
      updatedAt: new Date(),
    };
    
    // Handle each field explicitly to support null values
    if (profileData.firstName !== undefined) {
      safeProfileData.firstName = profileData.firstName;
    }
    
    if (profileData.age !== undefined) {
      safeProfileData.age = profileData.age;
    }
    
    if (profileData.region !== undefined) {
      safeProfileData.region = profileData.region;
    }
    
    if (profileData.churchId !== undefined) {
      safeProfileData.churchId = profileData.churchId; // This can be null
    }
    
    if (profileData.profileCompleted !== undefined) {
      safeProfileData.profileCompleted = profileData.profileCompleted;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(safeProfileData)
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  // DEPRECATED: Dangerous function that allows statistics manipulation
  // TODO: Remove this function or restrict to internal server use only
  // DO NOT use for client-facing operations
  async upsertUser(userData: UpsertUser): Promise<User> {
    console.warn(
      '⚠️  SECURITY WARNING: upsertUser allows statistics manipulation. Use safeUpsertUserFromAuth for client operations.'
    );
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Helper function to generate unique church code using nanoid for maximum entropy
  private async generateUniqueChurchCode(): Promise<string> {
    const { nanoid, customAlphabet } = await import('nanoid');
    
    // Use custom alphabet for church codes - uppercase letters and numbers, excluding confusing characters
    // Excludes: 0, O, 1, I, L to prevent confusion
    const generateCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8);

    // Keep trying until we find a unique code
    let attempts = 0;
    while (attempts < 100) { // Safety limit
      const code = generateCode();
      const existing = await this.getChurchByCode(code);
      if (!existing) {
        return code;
      }
      attempts++;
    }
    
    throw new Error('Failed to generate unique church code after 100 attempts');
  }

  // Church operations
  async createChurch(churchData: InsertChurch): Promise<Church> {
    const churchCode = await this.generateUniqueChurchCode();
    const [church] = await db.insert(churches).values({
      ...churchData,
      churchCode,
    }).returning();
    return church;
  }

  async getChurch(id: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.id, id));
    return church;
  }

  async getChurchByCode(churchCode: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.churchCode, churchCode.toUpperCase()));
    return church;
  }

  async getChurchMembers(churchId: string): Promise<Array<User & { isAdmin: boolean }>> {
    // Get church first to check if it exists and get admin info
    const church = await this.getChurch(churchId);
    if (!church) {
      return [];
    }

    const members = await db
      .select()
      .from(users)
      .where(eq(users.churchId, churchId))
      .orderBy(desc(users.averageWpm)); // Order by WPM descending

    // Add isAdmin flag for each member
    return members.map(member => ({
      ...member,
      isAdmin: member.id === church.adminId,
    }));
  }

  async joinChurchByCode(userId: string, churchCode: string): Promise<{ success: boolean; message: string }> {
    // Find church by code
    const church = await this.getChurchByCode(churchCode.toUpperCase());
    if (!church) {
      return { success: false, message: "교회 코드를 찾을 수 없습니다. 올바른 코드를 입력하세요." };
    }

    // Use existing joinChurch method
    return await this.joinChurch(userId, church.id);
  }

  async updateChurch(
    churchId: string, 
    updateData: Partial<Pick<Church, 'name' | 'description'>>
  ): Promise<Church> {
    // Validate church exists
    const existingChurch = await this.getChurch(churchId);
    if (!existingChurch) {
      throw new Error("Church not found");
    }

    // Update church
    const [updatedChurch] = await db
      .update(churches)
      .set(updateData)
      .where(eq(churches.id, churchId))
      .returning();

    return updatedChurch;
  }

  async getAllChurches(search?: string, limit: number = 50): Promise<Church[]> {
    if (search && search.trim()) {
      // Search in church name
      return await db
        .select()
        .from(churches)
        .where(
          sql`${churches.name} ILIKE ${`%${search.trim()}%`}`
        )
        .orderBy(churches.name)
        .limit(limit);
    }
    
    return await db
      .select()
      .from(churches)
      .orderBy(churches.name)
      .limit(limit);
  }

  async getUserChurch(userId: string): Promise<Church | undefined> {
    const [result] = await db
      .select()
      .from(churches)
      .innerJoin(users, eq(users.churchId, churches.id))
      .where(eq(users.id, userId));
    return result?.churches;
  }

  async joinChurch(userId: string, churchId: string): Promise<{ success: boolean; message: string }> {
    return await db.transaction(async (tx) => {
      // Get current user to check their current church
      const [currentUser] = await tx.select().from(users).where(eq(users.id, userId));
      if (!currentUser) {
        return { success: false, message: "User not found" };
      }

      // Check if user is already a member of this church
      if (currentUser.churchId === churchId) {
        return { success: false, message: "Already a member of this church" };
      }

      // Verify the target church exists
      const [targetChurch] = await tx.select().from(churches).where(eq(churches.id, churchId));
      if (!targetChurch) {
        return { success: false, message: "Church not found" };
      }

      // If user was in a different church, decrease that church's member count
      if (currentUser.churchId) {
        await tx
          .update(churches)
          .set({ 
            totalMembers: sql`GREATEST(${churches.totalMembers} - 1, 0)`
          })
          .where(eq(churches.id, currentUser.churchId));
      }

      // Update user's church membership
      await tx.update(users).set({ churchId }).where(eq(users.id, userId));

      // Increase new church's member count
      await tx
        .update(churches)
        .set({ 
          totalMembers: sql`${churches.totalMembers} + 1`
        })
        .where(eq(churches.id, churchId));

      const action = currentUser.churchId ? "transferred to" : "joined";
      return { success: true, message: `Successfully ${action} church` };
    });
  }

  async getChurchLeaderboard(limit: number = 10): Promise<Array<Church & { averageWpm: number; memberCount: number }>> {
    const result = await db
      .select({
        id: churches.id,
        name: churches.name,
        description: churches.description,
        adminId: churches.adminId,
        churchCode: churches.churchCode,
        totalMembers: churches.totalMembers,
        totalPoints: churches.totalPoints,
        createdAt: churches.createdAt,
        averageWpm: sql<number>`COALESCE(AVG(${users.averageWpm}), 0)`,
        memberCount: sql<number>`COUNT(${users.id})`,
      })
      .from(churches)
      .leftJoin(users, eq(users.churchId, churches.id))
      .groupBy(churches.id)
      .orderBy(desc(sql`COALESCE(AVG(${users.averageWpm}), 0)`))
      .limit(limit);
    
    return result;
  }

  // Bible operations
  async getBibleBooks(): Promise<BibleBook[]> {
    const cacheKey = 'bible:books';
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        // Only return canonical books (book_order 1-66)
        return await db.select({
          id: bibleBooks.id,
          bookCode: bibleBooks.bookCode,
          bookNameKr: bibleBooks.bookNameKr,
          bookNameEn: bibleBooks.bookNameEn,
          bookOrder: bibleBooks.bookOrder,
          testament: bibleBooks.testament,
          chapters: bibleBooks.chapters,
          verses: bibleBooks.verses,
        })
          .from(bibleBooks)
          .where(
            and(
              gte(bibleBooks.bookOrder, 1),
              lte(bibleBooks.bookOrder, 66)
            )
          )
          .orderBy(bibleBooks.bookOrder);
      },
      TTL.TWENTY_FOUR_HOURS
    );
  }

  async getBibleVerse(bookId: string, chapter: number, verse: number, translationId?: string): Promise<BibleVerse | undefined> {
    // Get default translation if not specified
    if (!translationId) {
      const defaultTranslation = await this.getDefaultTranslation();
      if (!defaultTranslation) {
        throw new Error("No default translation found");
      }
      translationId = defaultTranslation.id;
    }
    
    const cacheKey = `bibleVerse:${bookId}:${chapter}:${verse}:${translationId}`;
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        const [result] = await db
          .select()
          .from(bibleVerses)
          .where(
            and(
              eq(bibleVerses.bookId, bookId),
              eq(bibleVerses.chapter, chapter),
              eq(bibleVerses.verse, verse),
              eq(bibleVerses.translationId, translationId)
            )
          );
        return result;
      },
      TTL.TWENTY_FOUR_HOURS
    );
  }

  async getRandomVerse(translationId?: string): Promise<BibleVerse | undefined> {
    // Get default translation if not specified
    if (!translationId) {
      const defaultTranslation = await this.getDefaultTranslation();
      if (!defaultTranslation) {
        throw new Error("No default translation found");
      }
      translationId = defaultTranslation.id;
    }
    
    const [result] = await db
      .select()
      .from(bibleVerses)
      .where(eq(bibleVerses.translationId, translationId))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return result;
  }

  async getChapterVerses(bookId: string, chapter: number, translationId?: string): Promise<BibleVerse[]> {
    // Get default translation if not specified
    if (!translationId) {
      const defaultTranslation = await this.getDefaultTranslation();
      if (!defaultTranslation) {
        throw new Error("No default translation found");
      }
      translationId = defaultTranslation.id;
    }
    
    const cacheKey = `chapterVerses:${bookId}:${chapter}:${translationId}`;
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        return await db
          .select()
          .from(bibleVerses)
          .where(
            and(
              eq(bibleVerses.bookId, bookId),
              eq(bibleVerses.chapter, chapter),
              eq(bibleVerses.translationId, translationId)
            )
          )
          .orderBy(bibleVerses.verse);
      },
      TTL.TWENTY_FOUR_HOURS
    );
  }

  async getMaxChapterForBook(bookId: string, translationId?: string): Promise<number> {
    // Get default translation if not specified
    if (!translationId) {
      const defaultTranslation = await this.getDefaultTranslation();
      if (!defaultTranslation) {
        throw new Error("No default translation found");
      }
      translationId = defaultTranslation.id;
    }
    
    const cacheKey = `maxChapter:${bookId}:${translationId}`;
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        const result = await db
          .select({ maxChapter: sql<number>`MAX(${bibleVerses.chapter})` })
          .from(bibleVerses)
          .where(
            and(
              eq(bibleVerses.bookId, bookId),
              eq(bibleVerses.translationId, translationId)
            )
          );
        
        return result[0]?.maxChapter || 1;
      },
      TTL.TWENTY_FOUR_HOURS
    );
  }

  // Language and translation operations
  async getLanguages(): Promise<Language[]> {
    const cacheKey = 'languages:all';
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        return await db.select().from(languages).orderBy(languages.name);
      },
      TTL.TWENTY_FOUR_HOURS
    );
  }

  async getTranslationsByLanguage(languageCode: string): Promise<Translation[]> {
    const cacheKey = `translations:language:${languageCode}`;
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        return await db
          .select()
          .from(translations)
          .innerJoin(languages, eq(translations.languageId, languages.id))
          .where(eq(languages.code, languageCode))
          .then(results => results.map(result => result.translations));
      },
      TTL.TWENTY_FOUR_HOURS
    );
  }

  // 번들 API: 첫 로딩에 필요한 모든 데이터를 한 번에 가져오기
  async getBibleInitialData(includePrefetch: boolean = false): Promise<{
    languages: Language[];
    koreanTranslations: Translation[];
    books: BibleBook[];
    defaultVerse: BibleVerse | null;
    defaultTranslation: Translation | null;
    popularChapters: BibleVerse[][];
  }> {
    const cacheKey = includePrefetch ? 'bible:initial-data-full' : 'bible:initial-data-lite';
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`📦 번들 API 실행: ${includePrefetch ? '프리페칭 포함' : '필수 데이터만'}`);
        
        // 병렬로 데이터 가져오기
        const [languages, books, defaultTranslation] = await Promise.all([
          this.getLanguages(),
          this.getBibleBooks(),
          this.getDefaultTranslation(),
        ]);

        // 한국어 번역본들 가져오기
        const koreanTranslations = await this.getTranslationsByLanguage('ko');

        // 기본 구절 가져오기 (창세기 1:1)
        let defaultVerse: BibleVerse | null = null;
        if (defaultTranslation && books.length > 0) {
          const genesisBook = books.find(book => book.bookOrder === 1); // 창세기
          if (genesisBook) {
            const verse = await this.getBibleVerse(genesisBook.id, 1, 1, defaultTranslation.id);
            defaultVerse = verse || null;
          }
        }

        // 🚀 선택적 인기 구절들 프리페칭 (성능 최적화)
        const popularChapters: BibleVerse[][] = [];
        if (includePrefetch && defaultTranslation && books.length > 0) {
          console.log('🚀 인기 구절 프리페칭 시작...');
          const popularChapterRefs = [
            { bookOrder: 1, chapter: 1 },   // 창세기 1장
            { bookOrder: 19, chapter: 23 },  // 시편 23편
            { bookOrder: 19, chapter: 1 },   // 시편 1편
            { bookOrder: 43, chapter: 3 },   // 요한복음 3장
            { bookOrder: 40, chapter: 5 },   // 마태복음 5장 (산상수훈)
            { bookOrder: 46, chapter: 13 },  // 고린도전서 13장 (사랑장)
          ];

          const chapterPromises = popularChapterRefs.map(async (ref) => {
            const book = books.find(b => b.bookOrder === ref.bookOrder);
            if (book) {
              try {
                return await this.getChapterVerses(book.id, ref.chapter, defaultTranslation.id);
              } catch (error) {
                console.warn(`Failed to prefetch ${book.bookNameKr} ${ref.chapter}장:`, error);
                return [];
              }
            }
            return [];
          });

          const chapters = await Promise.all(chapterPromises);
          popularChapters.push(...chapters.filter(chapter => chapter.length > 0));
          console.log(`✅ 인기 구절 프리페칭 완료: ${popularChapters.length}개 장`);
        }

        return {
          languages,
          koreanTranslations,
          books,
          defaultVerse,
          defaultTranslation: defaultTranslation || null,
          popularChapters,
        };
      },
      TTL.ONE_HOUR // 1시간 캐시 (데이터가 크므로 조금 짧게)
    );
  }

  async getDefaultTranslation(): Promise<Translation | undefined> {
    const cacheKey = 'translation:default';
    
    return await cache.getOrSet(
      cacheKey,
      async () => {
        // Find the 개역개정 translation (Korean Revised Version) - most complete translation
        const [result] = await db
          .select()
          .from(translations)
          .where(eq(translations.code, "GAEREVIS"))
          .limit(1);
        
        if (result) {
          return result;
        }
        
        // Fallback to GAE if GAEREVIS not found
        const [fallback] = await db
          .select()
          .from(translations)
          .where(eq(translations.code, "GAE"))
          .limit(1);
        return fallback;
      },
      TTL.PERMANENT // Permanent cache for default translation
    );
  }

  // Typing session operations
  async createTypingSession(sessionData: InsertTypingSession): Promise<TypingSession> {
    return await db.transaction(async (tx) => {
      // Create the typing session
      const [session] = await tx.insert(typingSessions).values(sessionData).returning();
      
      // Update user stats after creating session
      await this.updateUserStats(sessionData.userId);
      
      // Update challenge progress for this session
      await this.updateChallengesAfterSession(sessionData.userId, session);
      
      return session;
    });
  }

  async getUserTypingSessions(userId: string, limit: number = 20): Promise<TypingSession[]> {
    return await db
      .select()
      .from(typingSessions)
      .where(eq(typingSessions.userId, userId))
      .orderBy(desc(typingSessions.completedAt))
      .limit(limit);
  }

  async getUserStats(userId: string): Promise<{
    totalWords: number;
    averageWpm: number;
    averageAccuracy: number;
    totalSessions: number;
  }> {
    const [result] = await db
      .select({
        totalWords: sql<number>`COALESCE(SUM(${typingSessions.wordsTyped}), 0)`,
        averageWpm: sql<number>`COALESCE(AVG(${typingSessions.wpm}), 0)`,
        averageAccuracy: sql<number>`COALESCE(AVG(${typingSessions.accuracy}), 0)`,
        totalSessions: sql<number>`COUNT(*)`,
      })
      .from(typingSessions)
      .where(eq(typingSessions.userId, userId));
    
    return result || { totalWords: 0, averageWpm: 0, averageAccuracy: 0, totalSessions: 0 };
  }

  async updateUserStats(userId: string): Promise<void> {
    const stats = await this.getUserStats(userId);
    
    await db
      .update(users)
      .set({
        totalWords: stats.totalWords,
        averageWpm: stats.averageWpm,
        totalAccuracy: stats.averageAccuracy,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Leaderboard operations
  async getPersonalLeaderboard(limit: number = 10): Promise<Array<User & { churchName: string | null }>> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        age: users.age,
        region: users.region,
        authProvider: users.authProvider,
        authProviderId: users.authProviderId,
        churchId: users.churchId,
        totalWords: users.totalWords,
        totalAccuracy: users.totalAccuracy,
        averageWpm: users.averageWpm,
        practiceStreak: users.practiceStreak,
        totalPoints: users.totalPoints,
        isAdmin: users.isAdmin,
        phone: users.phone,
        address: users.address,
        interests: users.interests,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        profileCompleted: users.profileCompleted,
        privacyConsent: users.privacyConsent,
        marketingConsent: users.marketingConsent,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        churchName: sql<string | null>`${churches.name}`,
      })
      .from(users)
      .leftJoin(churches, eq(users.churchId, churches.id))
      .orderBy(desc(users.averageWpm))
      .limit(limit);
    
    return result;
  }

  // Enhanced leaderboard operations
  async getGlobalLeaderboard(
    sortBy: 'totalPoints' | 'averageWpm' | 'totalAccuracy' = 'totalPoints',
    timeRange: 'daily' | 'weekly' | 'monthly' | 'all' = 'all',
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    users: Array<User & { 
      churchName: string | null; 
      rank: number;
      recentSessions?: number;
    }>;
    total: number;
  }> {
    // Build time-based WHERE clause for recent sessions
    let timeFilter = sql`1=1`; // Default: no filter
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
      timeFilter = sql`${typingSessions.completedAt} >= ${startDate}`;
    }

    // Determine sort column
    let sortColumn;
    switch (sortBy) {
      case 'averageWpm':
        sortColumn = desc(users.averageWpm);
        break;
      case 'totalAccuracy':
        sortColumn = desc(users.totalAccuracy);
        break;
      default:
        sortColumn = desc(users.totalPoints);
    }

    // Get the ranked users
    const rankedUsers = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        age: users.age,
        region: users.region,
        authProvider: users.authProvider,
        authProviderId: users.authProviderId,
        churchId: users.churchId,
        totalWords: users.totalWords,
        totalAccuracy: users.totalAccuracy,
        averageWpm: users.averageWpm,
        practiceStreak: users.practiceStreak,
        totalPoints: users.totalPoints,
        isAdmin: users.isAdmin,
        phone: users.phone,
        address: users.address,
        interests: users.interests,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        profileCompleted: users.profileCompleted,
        privacyConsent: users.privacyConsent,
        marketingConsent: users.marketingConsent,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        churchName: sql<string | null>`${churches.name}`,
        rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${sortBy === 'averageWpm' ? users.averageWpm : sortBy === 'totalAccuracy' ? users.totalAccuracy : users.totalPoints} DESC)`,
        recentSessions: timeRange !== 'all' ? sql<number>`COUNT(DISTINCT ${typingSessions.id})` : sql<number>`NULL`,
      })
      .from(users)
      .leftJoin(churches, eq(users.churchId, churches.id))
      .leftJoin(typingSessions, timeRange !== 'all' ? and(eq(typingSessions.userId, users.id), timeFilter) : eq(typingSessions.userId, users.id))
      .groupBy(users.id, churches.name)
      .orderBy(sortColumn)
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);
    
    const total = totalResult[0]?.count || 0;

    return {
      users: rankedUsers,
      total
    };
  }

  async getChurchMemberLeaderboard(
    churchId: string, 
    sortBy: 'totalPoints' | 'averageWpm' | 'totalAccuracy' = 'totalPoints',
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    users: Array<User & { rank: number }>;
    total: number;
    churchInfo: Church;
  }> {
    // Get church info
    const churchInfo = await this.getChurch(churchId);
    if (!churchInfo) {
      throw new Error('Church not found');
    }

    // Determine sort column
    let sortColumn;
    switch (sortBy) {
      case 'averageWpm':
        sortColumn = desc(users.averageWpm);
        break;
      case 'totalAccuracy':
        sortColumn = desc(users.totalAccuracy);
        break;
      default:
        sortColumn = desc(users.totalPoints);
    }

    // Get ranked church members
    const rankedMembers = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        age: users.age,
        region: users.region,
        authProvider: users.authProvider,
        authProviderId: users.authProviderId,
        churchId: users.churchId,
        totalWords: users.totalWords,
        totalAccuracy: users.totalAccuracy,
        averageWpm: users.averageWpm,
        practiceStreak: users.practiceStreak,
        totalPoints: users.totalPoints,
        isAdmin: users.isAdmin,
        phone: users.phone,
        address: users.address,
        interests: users.interests,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        profileCompleted: users.profileCompleted,
        privacyConsent: users.privacyConsent,
        marketingConsent: users.marketingConsent,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${sortBy === 'averageWpm' ? users.averageWpm : sortBy === 'totalAccuracy' ? users.totalAccuracy : users.totalPoints} DESC)`,
      })
      .from(users)
      .where(eq(users.churchId, churchId))
      .orderBy(sortColumn)
      .limit(limit)
      .offset(offset);

    // Get total count of church members
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(eq(users.churchId, churchId));
    
    const total = totalResult[0]?.count || 0;

    return {
      users: rankedMembers,
      total,
      churchInfo
    };
  }

  async getUserRankInfo(userId: string): Promise<{
    globalRank: number;
    churchRank: number | null;
    totalUsers: number;
    totalChurchMembers: number | null;
    percentile: number;
    churchPercentile: number | null;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get global rank
    const globalRankResult = await db
      .select({ 
        rank: sql<number>`COUNT(*) + 1` 
      })
      .from(users)
      .where(sql`${users.totalPoints} > ${user.totalPoints}`);
    
    const globalRank = globalRankResult[0]?.rank || 1;

    // Get total users
    const totalUsersResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);
    
    const totalUsers = totalUsersResult[0]?.count || 1;

    // Calculate global percentile
    const percentile = Math.round((1 - (globalRank - 1) / totalUsers) * 100);

    let churchRank: number | null = null;
    let totalChurchMembers: number | null = null;
    let churchPercentile: number | null = null;

    // If user belongs to a church, calculate church rank
    if (user.churchId) {
      const churchRankResult = await db
        .select({ 
          rank: sql<number>`COUNT(*) + 1` 
        })
        .from(users)
        .where(
          and(
            eq(users.churchId, user.churchId),
            sql`${users.totalPoints} > ${user.totalPoints}`
          )
        );
      
      churchRank = churchRankResult[0]?.rank || 1;

      const totalChurchMembersResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.churchId, user.churchId));
      
      totalChurchMembers = totalChurchMembersResult[0]?.count || 1;
      churchPercentile = Math.round((1 - (churchRank - 1) / totalChurchMembers) * 100);
    }

    return {
      globalRank,
      churchRank,
      totalUsers,
      totalChurchMembers,
      percentile,
      churchPercentile,
    };
  }

  async getEnhancedChurchLeaderboard(
    sortBy: 'totalPoints' | 'averageWpm' | 'memberCount' = 'totalPoints',
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    churches: Array<Church & { 
      averageWpm: number; 
      memberCount: number;
      totalPoints: number;
      rank: number;
      activeMembers: number;
    }>;
    total: number;
  }> {
    // Calculate last 7 days for active members
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Determine sort column
    let sortColumn;
    switch (sortBy) {
      case 'averageWpm':
        sortColumn = desc(sql`COALESCE(AVG(${users.averageWpm}), 0)`);
        break;
      case 'memberCount':
        sortColumn = desc(sql`COUNT(${users.id})`);
        break;
      default:
        sortColumn = desc(sql`COALESCE(SUM(${users.totalPoints}), 0)`);
    }

    const rankedChurches = await db
      .select({
        id: churches.id,
        name: churches.name,
        description: churches.description,
        adminId: churches.adminId,
        churchCode: churches.churchCode,
        totalMembers: churches.totalMembers,
        totalPoints: sql<number>`COALESCE(SUM(${users.totalPoints}), 0)`,
        createdAt: churches.createdAt,
        averageWpm: sql<number>`COALESCE(AVG(${users.averageWpm}), 0)`,
        memberCount: sql<number>`COUNT(${users.id})`,
        activeMembers: sql<number>`COUNT(DISTINCT CASE WHEN ${typingSessions.completedAt} >= ${sevenDaysAgo} THEN ${users.id} END)`,
        rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${sortBy === 'averageWpm' ? sql`COALESCE(AVG(${users.averageWpm}), 0)` : sortBy === 'memberCount' ? sql`COUNT(${users.id})` : sql`COALESCE(SUM(${users.totalPoints}), 0)`} DESC)`,
      })
      .from(churches)
      .leftJoin(users, eq(users.churchId, churches.id))
      .leftJoin(typingSessions, eq(typingSessions.userId, users.id))
      .groupBy(churches.id)
      .orderBy(sortColumn)
      .limit(limit)
      .offset(offset);

    // Get total count of churches
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(churches);
    
    const total = totalResult[0]?.count || 0;

    return {
      churches: rankedChurches,
      total
    };
  }

  // Challenge operations
  async getActiveChallenges(): Promise<Challenge[]> {
    const now = new Date();
    return await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.isActive, true),
          lte(challenges.startDate, now),
          gte(challenges.endDate, now)
        )
      )
      .orderBy(challenges.endDate);
  }

  async joinChallenge(participationData: InsertChallengeParticipation): Promise<ChallengeParticipation> {
    const [participation] = await db
      .insert(challengeParticipations)
      .values(participationData)
      .returning();

    // Update participant count
    await db
      .update(challenges)
      .set({
        participantCount: sql`${challenges.participantCount} + 1`
      })
      .where(eq(challenges.id, participationData.challengeId));

    return participation;
  }

  async getUserChallengeProgress(userId: string, challengeId: string): Promise<ChallengeParticipation | undefined> {
    const [result] = await db
      .select()
      .from(challengeParticipations)
      .where(
        and(
          eq(challengeParticipations.userId, userId),
          eq(challengeParticipations.challengeId, challengeId)
        )
      );
    return result;
  }

  async updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<void> {
    await db
      .update(challengeParticipations)
      .set({
        progress,
        isCompleted: progress >= 100,
        completedAt: progress >= 100 ? new Date() : null,
      })
      .where(
        and(
          eq(challengeParticipations.userId, userId),
          eq(challengeParticipations.challengeId, challengeId)
        )
      );
  }

  async getUserActiveChallengeParticipations(userId: string): Promise<Array<ChallengeParticipation & { challenge: Challenge }>> {
    const now = new Date();
    const result = await db
      .select({
        id: challengeParticipations.id,
        userId: challengeParticipations.userId,
        challengeId: challengeParticipations.challengeId,
        progress: challengeParticipations.progress,
        isCompleted: challengeParticipations.isCompleted,
        pointsEarned: challengeParticipations.pointsEarned,
        joinedAt: challengeParticipations.joinedAt,
        completedAt: challengeParticipations.completedAt,
        challenge: {
          id: challenges.id,
          title: challenges.title,
          description: challenges.description,
          type: challenges.type,
          targetVerseIds: challenges.targetVerseIds,
          requiredAccuracy: challenges.requiredAccuracy,
          requiredWpm: challenges.requiredWpm,
          pointsReward: challenges.pointsReward,
          startDate: challenges.startDate,
          endDate: challenges.endDate,
          isActive: challenges.isActive,
          participantCount: challenges.participantCount,
        }
      })
      .from(challengeParticipations)
      .innerJoin(challenges, eq(challengeParticipations.challengeId, challenges.id))
      .where(
        and(
          eq(challengeParticipations.userId, userId),
          eq(challengeParticipations.isCompleted, false),
          eq(challenges.isActive, true),
          lte(challenges.startDate, now),
          gte(challenges.endDate, now)
        )
      );
    
    return result;
  }

  private calculateChallengeProgress(
    session: TypingSession,
    challenge: Challenge,
    existingProgress: number,
    userSessions: TypingSession[]
  ): number {
    // Check if session meets basic requirements
    if (session.wpm < (challenge.requiredWpm || 0) || session.accuracy < (challenge.requiredAccuracy || 0)) {
      return existingProgress; // No progress if requirements not met
    }

    // Check if challenge has target verses and session matches
    if (challenge.targetVerseIds) {
      try {
        const targetVerses: string[] = JSON.parse(challenge.targetVerseIds);
        if (targetVerses.length > 0 && !targetVerses.includes(session.verseId)) {
          return existingProgress; // No progress if not typing target verse
        }
      } catch (error) {
        console.error("Error parsing targetVerseIds:", error);
      }
    }

    // Calculate progress based on challenge type
    const challengeStart = new Date(challenge.startDate);
    const challengeEnd = new Date(challenge.endDate);
    const now = new Date();

    // Filter sessions within challenge timeframe that meet requirements
    const relevantSessions = userSessions.filter(s => 
      s.completedAt !== null &&
      new Date(s.completedAt) >= challengeStart &&
      new Date(s.completedAt) <= challengeEnd &&
      s.wpm >= (challenge.requiredWpm || 0) &&
      s.accuracy >= (challenge.requiredAccuracy || 0) &&
      (!challenge.targetVerseIds || this.sessionMatchesTargetVerses(s, challenge.targetVerseIds))
    );

    let targetGoal: number;
    let currentProgress: number;

    switch (challenge.type) {
      case 'daily':
        // Daily challenge: Complete at least 1 qualifying session
        targetGoal = 1;
        currentProgress = relevantSessions.length >= 1 ? 1 : 0;
        break;
      
      case 'weekly':
        // Weekly challenge: Complete at least 5 qualifying sessions
        targetGoal = 5;
        currentProgress = Math.min(relevantSessions.length, targetGoal);
        break;
      
      case 'monthly':
        // Monthly challenge: Complete at least 20 qualifying sessions
        targetGoal = 20;
        currentProgress = Math.min(relevantSessions.length, targetGoal);
        break;
      
      default:
        // Default: treat as daily
        targetGoal = 1;
        currentProgress = relevantSessions.length >= 1 ? 1 : 0;
        break;
    }

    // Calculate percentage
    const progressPercentage = (currentProgress / targetGoal) * 100;
    return Math.min(progressPercentage, 100);
  }

  private sessionMatchesTargetVerses(session: TypingSession, targetVerseIds: string): boolean {
    try {
      const targetVerses: string[] = JSON.parse(targetVerseIds);
      return targetVerses.length === 0 || targetVerses.includes(session.verseId);
    } catch (error) {
      console.error("Error parsing targetVerseIds:", error);
      return true; // If parsing fails, assume it matches
    }
  }

  async updateChallengesAfterSession(userId: string, session: TypingSession): Promise<void> {
    return await db.transaction(async (tx) => {
      // Get user's active challenge participations
      const participations = await this.getUserActiveChallengeParticipations(userId);
      
      if (participations.length === 0) {
        return; // No active challenges to update
      }

      // Get user's recent sessions for progress calculation
      const challengeStart = Math.min(...participations.map(p => new Date(p.challenge.startDate).getTime()));
      const userRecentSessions = await tx
        .select()
        .from(typingSessions)
        .where(
          and(
            eq(typingSessions.userId, userId),
            gte(typingSessions.completedAt, new Date(challengeStart))
          )
        )
        .orderBy(desc(typingSessions.completedAt));

      // Update progress for each active challenge
      for (const participation of participations) {
        const newProgress = this.calculateChallengeProgress(
          session,
          participation.challenge,
          participation.progress || 0,
          userRecentSessions
        );

        // Only update if progress changed
        if (newProgress !== participation.progress) {
          const isCompleted = newProgress >= 100;
          const pointsEarned = isCompleted && !participation.isCompleted 
            ? participation.challenge.pointsReward || 0 
            : participation.pointsEarned || 0;

          await tx
            .update(challengeParticipations)
            .set({
              progress: newProgress,
              isCompleted,
              pointsEarned,
              completedAt: isCompleted && !participation.isCompleted ? new Date() : participation.completedAt,
            })
            .where(eq(challengeParticipations.id, participation.id));

          // If challenge was just completed, update user's total points
          if (isCompleted && !participation.isCompleted && pointsEarned > 0) {
            await tx
              .update(users)
              .set({
                totalPoints: sql`${users.totalPoints} + ${pointsEarned}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));
          }
        }
      }
    });
  }

  // Admin operations implementation
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalChurches: number;
    totalTypingSessions: number;
    averageWpm: number;
    averageAccuracy: number;
    newUsersThisWeek: number;
    activeUsersToday: number;
    usersByAge: Array<{ ageRange: string; count: number }>;
    usersByRegion: Array<{ region: string; count: number }>;
    churchMemberStats: Array<{ churchName: string; memberCount: number; averageWpm: number }>;
    recentActivity: Array<{ date: string; sessions: number; newUsers: number }>;
  }> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get basic counts
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [totalChurchesResult] = await db.select({ count: count() }).from(churches);
    const [totalSessionsResult] = await db.select({ count: count() }).from(typingSessions);

    // Get average WPM and accuracy
    const [avgStatsResult] = await db
      .select({
        avgWpm: avg(typingSessions.wpm),
        avgAccuracy: avg(typingSessions.accuracy),
      })
      .from(typingSessions)
      .where(sql`${typingSessions.completedAt} IS NOT NULL`);

    // Get new users this week
    const [newUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, oneWeekAgo));

    // Get active users today (users with sessions today)
    const [activeUsersResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
      .from(users)
      .innerJoin(typingSessions, eq(users.id, typingSessions.userId))
      .where(gte(typingSessions.completedAt, today));

    // Get users by age range
    const usersByAge = await db
      .select({
        ageRange: sql<string>`
          CASE 
            WHEN ${users.age} < 20 THEN '10-19세'
            WHEN ${users.age} < 30 THEN '20-29세'
            WHEN ${users.age} < 40 THEN '30-39세'
            WHEN ${users.age} < 50 THEN '40-49세'
            WHEN ${users.age} < 60 THEN '50-59세'
            WHEN ${users.age} >= 60 THEN '60세 이상'
            ELSE '미등록'
          END
        `,
        count: count(),
      })
      .from(users)
      .groupBy(sql`
        CASE 
          WHEN ${users.age} < 20 THEN '10-19세'
          WHEN ${users.age} < 30 THEN '20-29세'
          WHEN ${users.age} < 40 THEN '30-39세'
          WHEN ${users.age} < 50 THEN '40-49세'
          WHEN ${users.age} < 60 THEN '50-59세'
          WHEN ${users.age} >= 60 THEN '60세 이상'
          ELSE '미등록'
        END
      `)
      .orderBy(sql`
        CASE 
          WHEN ${users.age} < 20 THEN 1
          WHEN ${users.age} < 30 THEN 2
          WHEN ${users.age} < 40 THEN 3
          WHEN ${users.age} < 50 THEN 4
          WHEN ${users.age} < 60 THEN 5
          WHEN ${users.age} >= 60 THEN 6
          ELSE 7
        END
      `);

    // Get users by region
    const usersByRegion = await db
      .select({
        region: sql<string>`COALESCE(${users.region}, '미등록')`,
        count: count(),
      })
      .from(users)
      .groupBy(users.region)
      .orderBy(desc(count()));

    // Get church member stats
    const churchMemberStats = await db
      .select({
        churchName: churches.name,
        memberCount: count(users.id),
        averageWpm: sql<number>`ROUND(AVG(${users.averageWpm}), 1)`,
      })
      .from(churches)
      .leftJoin(users, eq(churches.id, users.churchId))
      .groupBy(churches.id, churches.name)
      .orderBy(desc(count(users.id)));

    // Get recent activity (last 7 days)
    const recentActivity = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS date
      ),
      session_counts AS (
        SELECT 
          DATE(${typingSessions.completedAt}) as session_date,
          COUNT(*) as sessions
        FROM ${typingSessions}
        WHERE ${typingSessions.completedAt} >= CURRENT_DATE - INTERVAL '6 days'
          AND ${typingSessions.completedAt} IS NOT NULL
        GROUP BY DATE(${typingSessions.completedAt})
      ),
      user_counts AS (
        SELECT 
          DATE(${users.createdAt}) as user_date,
          COUNT(*) as new_users
        FROM ${users}
        WHERE ${users.createdAt} >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(${users.createdAt})
      )
      SELECT 
        ds.date::text as date,
        COALESCE(sc.sessions, 0) as sessions,
        COALESCE(uc.new_users, 0) as new_users
      FROM date_series ds
      LEFT JOIN session_counts sc ON ds.date = sc.session_date
      LEFT JOIN user_counts uc ON ds.date = uc.user_date
      ORDER BY ds.date
    `);

    return {
      totalUsers: totalUsersResult.count,
      totalChurches: totalChurchesResult.count,
      totalTypingSessions: totalSessionsResult.count,
      averageWpm: Math.round(((avgStatsResult.avgWpm ?? 0) as number) * 10) / 10,
      averageAccuracy: Math.round(((avgStatsResult.avgAccuracy ?? 0) as number) * 10) / 10,
      newUsersThisWeek: newUsersResult.count,
      activeUsersToday: activeUsersResult.count,
      usersByAge,
      usersByRegion,
      churchMemberStats: churchMemberStats.map(stat => ({
        churchName: stat.churchName,
        memberCount: stat.memberCount,
        averageWpm: stat.averageWpm || 0,
      })),
      recentActivity: recentActivity.rows.map((row: any) => ({
        date: row.date,
        sessions: parseInt(row.sessions),
        newUsers: parseInt(row.new_users),
      })),
    };
  }

  async makeUserAdmin(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { success: false, message: "사용자를 찾을 수 없습니다." };
      }

      if (user.isAdmin) {
        return { success: false, message: "이미 관리자입니다." };
      }

      await db
        .update(users)
        .set({ 
          isAdmin: true, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));

      return { success: true, message: "사용자가 관리자로 승격되었습니다." };
    } catch (error) {
      console.error("Error making user admin:", error);
      return { success: false, message: "관리자 승격에 실패했습니다." };
    }
  }

  async removeUserAdmin(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { success: false, message: "사용자를 찾을 수 없습니다." };
      }

      if (!user.isAdmin) {
        return { success: false, message: "이미 일반 사용자입니다." };
      }

      await db
        .update(users)
        .set({ 
          isAdmin: false, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));

      return { success: true, message: "관리자 권한이 해제되었습니다." };
    } catch (error) {
      console.error("Error removing user admin:", error);
      return { success: false, message: "관리자 권한 해제에 실패했습니다." };
    }
  }

  // Dashboard operations
  async getUserDashboard(userId: string): Promise<{
    user: User;
    stats: {
      totalWords: number;
      averageWpm: number;
      averageAccuracy: number;
      totalSessions: number;
      practiceStreak: number;
      totalPoints: number;
    };
    rankings: {
      globalRank: number;
      churchRank: number | null;
      totalUsers: number;
      percentile: number;
    };
    recentSessions: TypingSession[];
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      unlockedAt: Date | null;
      progress: number;
      total: number;
    }>;
    weeklyProgress: Array<{
      date: string;
      sessions: number;
      wordsTyped: number;
      avgWpm: number;
    }>;
  }> {
    try {
      // Get user info
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Get user stats
      const stats = await this.getUserStats(userId);
      const enhancedStats = {
        ...stats,
        practiceStreak: user.practiceStreak ?? 0,
        totalPoints: user.totalPoints ?? 0,
      };

      // Get user rankings
      const rankInfo = await this.getUserRankInfo(userId);
      const rankings = {
        globalRank: rankInfo.globalRank,
        churchRank: rankInfo.churchRank,
        totalUsers: rankInfo.totalUsers,
        percentile: rankInfo.percentile,
      };

      // Get recent sessions (limit 5 for dashboard)
      const recentSessions = await this.getUserTypingSessions(userId, 5);

      // Get user achievements
      const achievements = await this.getUserAchievements(userId);

      // Get weekly progress (last 7 days)
      const weeklyProgress = await this.getWeeklyProgress(userId);

      return {
        user,
        stats: enhancedStats,
        rankings,
        recentSessions,
        achievements,
        weeklyProgress,
      };
    } catch (error) {
      console.error("Error getting user dashboard:", error);
      throw error;
    }
  }

  async getUserRecentSessions(userId: string, limit: number = 10): Promise<Array<TypingSession & {
    bookName: string;
    chapter: number;
    verse: number;
  }>> {
    try {
      const sessions = await db
        .select({
          id: typingSessions.id,
          userId: typingSessions.userId,
          wpm: typingSessions.wpm,
          accuracy: typingSessions.accuracy,
          wordsTyped: typingSessions.wordsTyped,
          timeSpent: typingSessions.timeSpent,
          pointsEarned: typingSessions.pointsEarned,
          completedAt: typingSessions.completedAt,
          verseId: typingSessions.verseId,
          bookName: bibleBooks.bookNameKr,
          chapter: bibleVerses.chapter,
          verse: bibleVerses.verse,
        })
        .from(typingSessions)
        .leftJoin(bibleVerses, eq(typingSessions.verseId, bibleVerses.id))
        .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(eq(typingSessions.userId, userId))
        .orderBy(desc(typingSessions.completedAt))
        .limit(limit);

      return sessions.map(session => ({
        ...session,
        bookName: session.bookName || "알 수 없음",
        chapter: session.chapter || 0,
        verse: session.verse || 0,
      }));
    } catch (error) {
      console.error("Error getting user recent sessions:", error);
      return [];
    }
  }

  async getUserProgress(userId: string): Promise<{
    bibleProgress: Array<{
      bookId: string;
      bookName: string;
      chaptersCompleted: number;
      totalChapters: number;
      progressPercentage: number;
    }>;
    dailyGoal: {
      targetSessions: number;
      targetWords: number;
      currentSessions: number;
      currentWords: number;
    };
    weeklyGoal: {
      targetSessions: number;
      targetWords: number;
      currentSessions: number;
      currentWords: number;
    };
  }> {
    try {
      // Get bible progress by calculating unique chapters completed per book
      const bibleProgressQuery = await db
        .select({
          bookId: bibleBooks.id,
          bookName: bibleBooks.bookNameKr,
          chaptersCompleted: count(sql`DISTINCT ${bibleVerses.chapter}`),
        })
        .from(typingSessions)
        .innerJoin(bibleVerses, eq(typingSessions.verseId, bibleVerses.id))
        .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(eq(typingSessions.userId, userId))
        .groupBy(bibleBooks.id, bibleBooks.bookNameKr)
        .orderBy(bibleBooks.bookOrder);

      // Get total chapters for each book (simplified assumption)
      const totalChaptersMap: Record<string, number> = {
        // 구약 39권
        "1": 50, "2": 40, "3": 27, "4": 36, "5": 34, "6": 24, "7": 21, "8": 4, "9": 31, "10": 24,
        "11": 22, "12": 25, "13": 29, "14": 36, "15": 10, "16": 13, "17": 10, "18": 42, "19": 150, "20": 31,
        "21": 12, "22": 8, "23": 66, "24": 52, "25": 5, "26": 48, "27": 12, "28": 14, "29": 3, "30": 9,
        "31": 1, "32": 4, "33": 7, "34": 3, "35": 3, "36": 3, "37": 2, "38": 14, "39": 4,
        // 신약 27권
        "40": 28, "41": 16, "42": 24, "43": 21, "44": 28, "45": 16, "46": 16, "47": 13, "48": 6, "49": 6,
        "50": 4, "51": 5, "52": 3, "53": 6, "54": 4, "55": 4, "56": 3, "57": 1, "58": 13, "59": 5,
        "60": 5, "61": 3, "62": 5, "63": 1, "64": 1, "65": 1, "66": 22
      };

      const bibleProgress = bibleProgressQuery.map(book => ({
        bookId: book.bookId,
        bookName: book.bookName,
        chaptersCompleted: book.chaptersCompleted,
        totalChapters: totalChaptersMap[book.bookId] || 1,
        progressPercentage: Math.round((book.chaptersCompleted / (totalChaptersMap[book.bookId] || 1)) * 100),
      }));

      // Get daily progress (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const dailyProgress = await db
        .select({
          sessions: count(typingSessions.id),
          words: sum(typingSessions.wordsTyped),
        })
        .from(typingSessions)
        .where(
          and(
            eq(typingSessions.userId, userId),
            gte(typingSessions.completedAt, today),
            lte(typingSessions.completedAt, todayEnd)
          )
        );

      // Get weekly progress (last 7 days)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const weeklyProgress = await db
        .select({
          sessions: count(typingSessions.id),
          words: sum(typingSessions.wordsTyped),
        })
        .from(typingSessions)
        .where(
          and(
            eq(typingSessions.userId, userId),
            gte(typingSessions.completedAt, weekStart)
          )
        );

      return {
        bibleProgress,
        dailyGoal: {
          targetSessions: 3, // Default daily goal
          targetWords: 500,  // Default daily goal
          currentSessions: Number(dailyProgress[0]?.sessions) || 0,
          currentWords: Number(dailyProgress[0]?.words) || 0,
        },
        weeklyGoal: {
          targetSessions: 20, // Default weekly goal
          targetWords: 3500, // Default weekly goal
          currentSessions: Number(weeklyProgress[0]?.sessions) || 0,
          currentWords: Number(weeklyProgress[0]?.words) || 0,
        },
      };
    } catch (error) {
      console.error("Error getting user progress:", error);
      return {
        bibleProgress: [],
        dailyGoal: { targetSessions: 3, targetWords: 500, currentSessions: 0, currentWords: 0 },
        weeklyGoal: { targetSessions: 20, targetWords: 3500, currentSessions: 0, currentWords: 0 },
      };
    }
  }

  async getUserAchievements(userId: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'typing' | 'speed' | 'accuracy' | 'streak' | 'bible';
    unlockedAt: Date | null;
    progress: number;
    total: number;
    isUnlocked: boolean;
  }>> {
    try {
      const user = await this.getUser(userId);
      const stats = await this.getUserStats(userId);
      
      if (!user) return [];

      // Define achievements
      const achievementDefinitions = [
        // Typing achievements
        { id: 'first_session', name: '첫 발걸음', description: '첫 번째 연습 완료', icon: '🎯', category: 'typing' as const, target: 1, current: stats.totalSessions },
        { id: 'sessions_10', name: '꾸준함', description: '10회 연습 완료', icon: '📚', category: 'typing' as const, target: 10, current: stats.totalSessions },
        { id: 'sessions_50', name: '열정적', description: '50회 연습 완료', icon: '🔥', category: 'typing' as const, target: 50, current: stats.totalSessions },
        { id: 'sessions_100', name: '헌신자', description: '100회 연습 완료', icon: '👑', category: 'typing' as const, target: 100, current: stats.totalSessions },
        
        // Speed achievements
        { id: 'wpm_30', name: '속도의 기초', description: '평균 30 WPM 달성', icon: '⚡', category: 'speed' as const, target: 30, current: stats.averageWpm },
        { id: 'wpm_50', name: '빠른 손가락', description: '평균 50 WPM 달성', icon: '🚀', category: 'speed' as const, target: 50, current: stats.averageWpm },
        { id: 'wpm_80', name: '타자 고수', description: '평균 80 WPM 달성', icon: '⭐', category: 'speed' as const, target: 80, current: stats.averageWpm },
        
        // Accuracy achievements
        { id: 'accuracy_95', name: '정확한 손', description: '평균 95% 정확도 달성', icon: '🎯', category: 'accuracy' as const, target: 95, current: stats.averageAccuracy },
        { id: 'accuracy_98', name: '완벽주의자', description: '평균 98% 정확도 달성', icon: '💯', category: 'accuracy' as const, target: 98, current: stats.averageAccuracy },
        
        // Streak achievements
        { id: 'streak_7', name: '일주일 도전', description: '7일 연속 연습', icon: '📅', category: 'streak' as const, target: 7, current: user.practiceStreak },
        { id: 'streak_30', name: '한 달 마라톤', description: '30일 연속 연습', icon: '🏆', category: 'streak' as const, target: 30, current: user.practiceStreak },
        
        // Words achievements
        { id: 'words_1000', name: '천 단어', description: '1,000 단어 입력', icon: '📝', category: 'typing' as const, target: 1000, current: stats.totalWords },
        { id: 'words_10000', name: '만 단어', description: '10,000 단어 입력', icon: '📖', category: 'typing' as const, target: 10000, current: stats.totalWords },
      ];

      return achievementDefinitions.map(achievement => ({
        ...achievement,
        progress: Math.min(achievement.current ?? 0, achievement.target),
        total: achievement.target,
        isUnlocked: (achievement.current ?? 0) >= achievement.target,
        unlockedAt: (achievement.current ?? 0) >= achievement.target ? new Date() : null,
      }));
    } catch (error) {
      console.error("Error getting user achievements:", error);
      return [];
    }
  }

  // Helper method for weekly progress
  private async getWeeklyProgress(userId: string): Promise<Array<{
    date: string;
    sessions: number;
    wordsTyped: number;
    avgWpm: number;
  }>> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weeklyData = await db
        .select({
          date: sql<string>`DATE(${typingSessions.completedAt})`,
          sessions: count(typingSessions.id),
          totalWords: sum(typingSessions.wordsTyped),
          avgWpm: avg(typingSessions.wpm),
        })
        .from(typingSessions)
        .where(
          and(
            eq(typingSessions.userId, userId),
            gte(typingSessions.completedAt, weekAgo)
          )
        )
        .groupBy(sql`DATE(${typingSessions.completedAt})`)
        .orderBy(sql`DATE(${typingSessions.completedAt})`);

      return weeklyData.map(day => ({
        date: day.date,
        sessions: Number(day.sessions),
        wordsTyped: Number(day.totalWords) || 0,
        avgWpm: Math.round(Number(day.avgWpm) || 0),
      }));
    } catch (error) {
      console.error("Error getting weekly progress:", error);
      return [];
    }
  }

  // Email authentication operations implementation
  async createEmailUser(email: string, hashedPassword: string, firstName: string): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        authProvider: 'email',
        emailVerified: false, // 이메일 인증 전까지 false
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return user;
  }

  async verifyUserPassword(email: string, password: string): Promise<User | undefined> {
    const bcrypt = await import('bcrypt');
    const user = await this.getUserByEmail(email);
    
    console.log(`🔍 Login attempt for ${email}:`);
    console.log(`   User found: ${!!user}`);
    console.log(`   Has password: ${!!user?.password}`);
    console.log(`   Email verified: ${user?.emailVerified}`);
    console.log(`   Auth provider: ${user?.authProvider}`);
    
    if (!user || !user.password) {
      console.log(`❌ No user or password found for ${email}`);
      return undefined;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`   Password valid: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      console.log(`❌ Invalid password for ${email}`);
      return undefined;
    }
    
    // 이메일이 인증되지 않은 경우 로그인 불가
    if (!user.emailVerified) {
      console.log(`❌ Email not verified for ${email}`);
      return undefined;
    }
    
    console.log(`✅ Login verification successful for ${email}`);
    return user;
  }

  async createVerificationToken(email: string, hashedToken: string, expiresAt: Date): Promise<EmailVerificationToken> {
    // 같은 이메일의 기존 토큰 삭제 (최신 토큰만 유효)
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.email, email));
    
    const [newToken] = await db
      .insert(emailVerificationTokens)
      .values({
        email,
        token: hashedToken, // 해시된 토큰 저장
        expiresAt,
        isUsed: false,
        createdAt: new Date(),
      })
      .returning();
    
    return newToken;
  }

  async getVerificationToken(hashedToken: string): Promise<EmailVerificationToken | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, hashedToken))
      .limit(1);
    
    return tokenRecord;
  }

  async markTokenAsUsed(hashedToken: string): Promise<void> {
    await db
      .update(emailVerificationTokens)
      .set({ 
        isUsed: true,
      })
      .where(eq(emailVerificationTokens.token, hashedToken));
  }

  async activateUserEmail(email: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    await db
      .delete(emailVerificationTokens)
      .where(
        or(
          lte(emailVerificationTokens.expiresAt, now),
          eq(emailVerificationTokens.isUsed, true)
        )
      );
  }

  // Password reset operations
  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // 같은 이메일의 기존 토큰 삭제 (최신 토큰만 유효)
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.email, email));
    
    const [newToken] = await db
      .insert(passwordResetTokens)
      .values({
        email,
        token: hashedToken, // 해시된 토큰 저장
        expiresAt,
        isUsed: false,
        createdAt: new Date(),
      })
      .returning();
    
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, hashedToken),
          eq(passwordResetTokens.isUsed, false),
          gte(passwordResetTokens.expiresAt, new Date())
        )
      );
    
    return tokenRecord;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    await db
      .update(passwordResetTokens)
      .set({ 
        isUsed: true,
      })
      .where(eq(passwordResetTokens.token, hashedToken));
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    const now = new Date();
    await db
      .delete(passwordResetTokens)
      .where(
        or(
          lte(passwordResetTokens.expiresAt, now),
          eq(passwordResetTokens.isUsed, true)
        )
      );
  }
  
  // Enhanced admin operations
  async createAdminRole(roleData: InsertAdminRole): Promise<AdminRole> {
    const [role] = await db
      .insert(adminRoles)
      .values({
        ...roleData,
        permissions: roleData.permissions || (DEFAULT_ROLE_PERMISSIONS as any)[roleData.role] || [],
      })
      .returning();
    return role;
  }
  
  async getUserAdminRoles(userId: string): Promise<AdminRole[]> {
    return await db
      .select()
      .from(adminRoles)
      .where(
        and(
          eq(adminRoles.userId, userId),
          eq(adminRoles.isActive, true),
          or(
            isNull(adminRoles.expiresAt),
            gte(adminRoles.expiresAt, new Date())
          )
        )
      );
  }
  
  async removeAdminRole(userId: string, role: string): Promise<void> {
    await db
      .update(adminRoles)
      .set({ isActive: false })
      .where(
        and(
          eq(adminRoles.userId, userId),
          eq(adminRoles.role, role)
        )
      );
  }
  
  async checkAdminPermission(userId: string, permission: AdminPermission): Promise<boolean> {
    const roles = await this.getUserAdminRoles(userId);
    return roles.some(role => 
      role.permissions?.includes(permission) || 
      role.role === 'super_admin'
    );
  }
  
  async checkAdminRole(userId: string, role: AdminRoleType): Promise<boolean> {
    const roles = await this.getUserAdminRoles(userId);
    return roles.some(r => r.role === role || r.role === 'super_admin');
  }
  
  async getAllAdminUsers(): Promise<Array<User & { roles: AdminRole[] }>> {
    const adminUsers = await db
      .select({
        user: users,
        role: adminRoles,
      })
      .from(users)
      .innerJoin(adminRoles, eq(users.id, adminRoles.userId))
      .where(
        and(
          eq(adminRoles.isActive, true),
          or(
            isNull(adminRoles.expiresAt),
            gte(adminRoles.expiresAt, new Date())
          )
        )
      );
    
    // Group by user
    const userMap = new Map<string, User & { roles: AdminRole[] }>();
    
    for (const { user, role } of adminUsers) {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, { ...user, roles: [] });
      }
      userMap.get(user.id)!.roles.push(role);
    }
    
    return Array.from(userMap.values());
  }
  
  // 2FA operations
  async createTwoFactorToken(userId: string, secret: string, backupCodes: string[]): Promise<TwoFactorToken> {
    // Delete existing 2FA token if any
    await db.delete(twoFactorTokens).where(eq(twoFactorTokens.userId, userId));
    
    const [token] = await db
      .insert(twoFactorTokens)
      .values({
        userId,
        secret,
        backupCodes,
        isEnabled: false,
      })
      .returning();
    return token;
  }
  
  async getTwoFactorToken(userId: string): Promise<TwoFactorToken | undefined> {
    const [token] = await db
      .select()
      .from(twoFactorTokens)
      .where(eq(twoFactorTokens.userId, userId))
      .limit(1);
    return token;
  }
  
  async enableTwoFactorAuth(userId: string): Promise<void> {
    await db
      .update(twoFactorTokens)
      .set({ 
        isEnabled: true,
        lastUsedAt: new Date(),
      })
      .where(eq(twoFactorTokens.userId, userId));
  }
  
  async disableTwoFactorAuth(userId: string): Promise<void> {
    await db
      .delete(twoFactorTokens)
      .where(eq(twoFactorTokens.userId, userId));
  }
  
  async verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
    const { authenticator } = await import('otplib');
    const twoFARecord = await this.getTwoFactorToken(userId);
    
    if (!twoFARecord || !twoFARecord.isEnabled) {
      return false;
    }
    
    try {
      const isValid = authenticator.verify({ token, secret: twoFARecord.secret });
      
      if (isValid) {
        await db
          .update(twoFactorTokens)
          .set({ lastUsedAt: new Date() })
          .where(eq(twoFactorTokens.userId, userId));
      }
      
      return isValid;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }
  
  async useTwoFactorBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFARecord = await this.getTwoFactorToken(userId);
    
    if (!twoFARecord || !twoFARecord.isEnabled || !twoFARecord.backupCodes) {
      return false;
    }
    
    const codeIndex = twoFARecord.backupCodes.indexOf(code);
    if (codeIndex === -1) {
      return false;
    }
    
    // Remove used backup code
    const updatedCodes = [...twoFARecord.backupCodes];
    updatedCodes.splice(codeIndex, 1);
    
    await db
      .update(twoFactorTokens)
      .set({
        backupCodes: updatedCodes,
        lastUsedAt: new Date(),
      })
      .where(eq(twoFactorTokens.userId, userId));
    
    return true;
  }
  
  // Admin access logging
  async logAdminAccess(logData: InsertAdminAccessLog): Promise<AdminAccessLog> {
    const [log] = await db
      .insert(adminAccessLogs)
      .values(logData)
      .returning();
    return log;
  }
  
  async getAdminAccessLogs(userId?: string, limit: number = 50, offset: number = 0): Promise<{
    logs: AdminAccessLog[];
    total: number;
  }> {
    const whereCondition = userId ? eq(adminAccessLogs.userId, userId) : sql`1=1`;
    
    const [logs, totalResult] = await Promise.all([
      db
        .select()
        .from(adminAccessLogs)
        .where(whereCondition)
        .orderBy(desc(adminAccessLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(adminAccessLogs)
        .where(whereCondition)
    ]);
    
    return {
      logs,
      total: totalResult[0]?.count || 0,
    };
  }
  
  async getAdminActionStats(timeRange: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<Array<{
    action: string;
    count: number;
    successRate: number;
  }>> {
    const now = new Date();
    let since: Date;
    
    switch (timeRange) {
      case 'daily':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const stats = await db
      .select({
        action: adminAccessLogs.action,
        count: sql<number>`COUNT(*)`,
        successCount: sql<number>`SUM(CASE WHEN ${adminAccessLogs.success} THEN 1 ELSE 0 END)`,
      })
      .from(adminAccessLogs)
      .where(gte(adminAccessLogs.createdAt, since))
      .groupBy(adminAccessLogs.action)
      .orderBy(desc(sql`COUNT(*)`));
    
    return stats.map(stat => ({
      action: stat.action,
      count: stat.count,
      successRate: stat.count > 0 ? (stat.successCount / stat.count) * 100 : 0,
    }));
  }
}

export const storage = new DatabaseStorage();
