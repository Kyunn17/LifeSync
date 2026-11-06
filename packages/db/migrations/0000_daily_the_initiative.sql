CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'USER' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" varchar(80) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"color" varchar(24) DEFAULT '#0d7a53' NOT NULL,
	"bg_color" varchar(24) DEFAULT '#eef4ff' NOT NULL,
	"icon" varchar(64) DEFAULT 'schedule' NOT NULL,
	"description" text,
	"target_minutes_per_day" integer DEFAULT 60 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"mood" varchar(40) NOT NULL,
	"energy_level" integer NOT NULL,
	"reflection" text,
	"sync_sleep_prediction" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text,
	"date" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"start_minutes" integer NOT NULL,
	"end_minutes" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"crosses_midnight" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"sleep_duration_minutes" integer DEFAULT 0 NOT NULL,
	"sleep_quality" integer DEFAULT 85,
	"exercise_duration_minutes" integer DEFAULT 0 NOT NULL,
	"daily_steps" integer DEFAULT 0 NOT NULL,
	"water_intake_ml" integer DEFAULT 0 NOT NULL,
	"mood" varchar(40) DEFAULT 'Calm' NOT NULL,
	"energy_level" integer DEFAULT 75 NOT NULL,
	"resting_heart_rate" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_tips" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(160) NOT NULL,
	"category" varchar(64) NOT NULL,
	"badge_text" varchar(64) DEFAULT 'High Impact',
	"content" text NOT NULL,
	"icon" varchar(64) DEFAULT 'lightbulb' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"author_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"primary_focus" text DEFAULT 'Optimal Sleep & Recovery' NOT NULL,
	"target_wake_time" varchar(5) DEFAULT '06:45' NOT NULL,
	"target_sleep_time" varchar(5) DEFAULT '22:30' NOT NULL,
	"daily_water_goal_ml" integer DEFAULT 2500 NOT NULL,
	"daily_steps_goal" integer DEFAULT 10000 NOT NULL,
	"daily_sleep_goal_minutes" integer DEFAULT 480 NOT NULL,
	"daily_exercise_goal_minutes" integer DEFAULT 45 NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"amount_ml" integer NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_schedules" ADD CONSTRAINT "daily_schedules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_schedules" ADD CONSTRAINT "daily_schedules_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_tips" ADD CONSTRAINT "health_tips_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "activities_user_id_idx" ON "activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activities_slug_idx" ON "activities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "activities_is_system_idx" ON "activities" USING btree ("is_system");--> statement-breakpoint
CREATE INDEX "daily_checkins_user_date_idx" ON "daily_checkins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "daily_schedules_user_date_idx" ON "daily_schedules" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "daily_schedules_activity_id_idx" ON "daily_schedules" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "health_logs_user_date_uidx" ON "health_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "health_logs_user_id_idx" ON "health_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "health_tips_category_idx" ON "health_tips" USING btree ("category");--> statement-breakpoint
CREATE INDEX "health_tips_is_active_idx" ON "health_tips" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_user_id_idx" ON "profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "water_logs_user_date_idx" ON "water_logs" USING btree ("user_id","date");