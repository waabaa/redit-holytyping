CREATE TABLE "bible_books" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_code" varchar(20) NOT NULL,
	"book_name_kr" varchar(100) NOT NULL,
	"book_name_en" varchar(100) NOT NULL,
	"book_order" integer NOT NULL,
	"testament" varchar(2) NOT NULL,
	"chapters" integer NOT NULL,
	"verses" integer NOT NULL,
	CONSTRAINT "bible_books_book_code_unique" UNIQUE("book_code")
);
--> statement-breakpoint
CREATE TABLE "bible_dictionary" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word" varchar(200) NOT NULL,
	"word_en" varchar(200),
	"word_ko" varchar(200),
	"word_zh" varchar(200),
	"word_ja" varchar(200),
	"definition_ko" text,
	"definition_en" text,
	"definition_zh" text,
	"definition_ja" text,
	"category" varchar(100),
	"related_verses" text
);
--> statement-breakpoint
CREATE TABLE "bible_verses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" varchar NOT NULL,
	"translation_id" varchar NOT NULL,
	"language_id" varchar NOT NULL,
	"book_code" varchar,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "bible_verses_translation_id_book_id_chapter_verse_unique" UNIQUE("translation_id","book_id","chapter","verse")
);
--> statement-breakpoint
CREATE TABLE "challenge_participations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"challenge_id" varchar NOT NULL,
	"progress" real DEFAULT 0,
	"is_completed" boolean DEFAULT false,
	"points_earned" integer DEFAULT 0,
	"joined_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "challenge_participations_user_id_challenge_id_unique" UNIQUE("user_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"target_verse_ids" text,
	"required_accuracy" real DEFAULT 95,
	"required_wpm" real DEFAULT 30,
	"points_reward" integer DEFAULT 100,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"participant_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "churches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"admin_id" varchar NOT NULL,
	"church_code" varchar(8) NOT NULL,
	"total_members" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "churches_church_code_unique" UNIQUE("church_code")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "hymns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"title_ko" varchar(300),
	"title_en" varchar(300),
	"title_zh" varchar(300),
	"title_ja" varchar(300),
	"lyrics_ko" text,
	"lyrics_en" text,
	"lyrics_zh" text,
	"lyrics_ja" text,
	"composer" varchar(200),
	"lyricist" varchar(200),
	"category" varchar(100),
	"key" varchar(10),
	"tempo" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"encoding" varchar(20),
	"direction" varchar(3) DEFAULT 'ltr',
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"language_id" varchar NOT NULL,
	"full_name" varchar(300),
	"year" integer,
	"publisher" varchar(200),
	CONSTRAINT "translations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "typing_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"verse_id" varchar NOT NULL,
	"wpm" real NOT NULL,
	"accuracy" real NOT NULL,
	"words_typed" integer NOT NULL,
	"time_spent" integer NOT NULL,
	"points_earned" integer DEFAULT 0,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password" varchar(255),
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"age" integer,
	"region" varchar(100),
	"auth_provider" varchar(50),
	"auth_provider_id" varchar(255),
	"church_id" varchar,
	"total_words" integer DEFAULT 0,
	"total_accuracy" real DEFAULT 0,
	"average_wpm" real DEFAULT 0,
	"practice_streak" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"is_admin" boolean DEFAULT false,
	"phone" varchar(20),
	"address" text,
	"interests" jsonb,
	"email_verified" boolean DEFAULT false,
	"phone_verified" boolean DEFAULT false,
	"profile_completed" boolean DEFAULT false,
	"privacy_consent" boolean DEFAULT false,
	"marketing_consent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_auth_provider_id_unique" UNIQUE("auth_provider","auth_provider_id")
);
--> statement-breakpoint
ALTER TABLE "bible_verses" ADD CONSTRAINT "bible_verses_book_id_bible_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_verses" ADD CONSTRAINT "bible_verses_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "churches" ADD CONSTRAINT "churches_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_sessions" ADD CONSTRAINT "typing_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_sessions" ADD CONSTRAINT "typing_sessions_verse_id_bible_verses_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bible_verses_book_chapter_verse" ON "bible_verses" USING btree ("book_id","chapter","verse");--> statement-breakpoint
CREATE INDEX "idx_bible_verses_translation" ON "bible_verses" USING btree ("translation_id");--> statement-breakpoint
CREATE INDEX "idx_churches_code" ON "churches" USING btree ("church_code");--> statement-breakpoint
CREATE INDEX "idx_churches_admin" ON "churches" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_email_verification_token" ON "email_verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_email_verification_email" ON "email_verification_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_email_verification_expires" ON "email_verification_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");