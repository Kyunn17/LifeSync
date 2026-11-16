CREATE TABLE "weight_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"weight_kg" real NOT NULL,
	"previous_weight_kg" real,
	"delta_kg" real DEFAULT 0 NOT NULL,
	"is_anomaly" boolean DEFAULT false NOT NULL,
	"anomaly_note" text,
	"notes" text,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "daily_pushup_goal" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "is_auto_calculated" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "gender" varchar(16) DEFAULT 'MALE';--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "age" integer DEFAULT 25;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "weight_kg" real DEFAULT 65;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "height_cm" real DEFAULT 170;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "neat_level" varchar(24) DEFAULT 'MODERATE' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "fitness_goal" varchar(24) DEFAULT 'MAINTENANCE' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "fitness_level" varchar(24) DEFAULT 'BEGINNER' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "medical_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "custom_medical_condition" text;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weight_logs_user_date_idx" ON "weight_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "weight_logs_user_logged_idx" ON "weight_logs" USING btree ("user_id","logged_at");