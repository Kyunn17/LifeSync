CREATE TABLE "custom_foods" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(160) NOT NULL,
	"brand" varchar(120),
	"calories" real NOT NULL,
	"proteins" real DEFAULT 0 NOT NULL,
	"carbohydrates" real DEFAULT 0 NOT NULL,
	"fat" real DEFAULT 0 NOT NULL,
	"serving_size" varchar(80) DEFAULT '1 porsi' NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"meal_type" varchar(24) NOT NULL,
	"food_id" text,
	"food_name" varchar(160) NOT NULL,
	"brand" varchar(120),
	"calories" real NOT NULL,
	"proteins" real DEFAULT 0 NOT NULL,
	"carbohydrates" real DEFAULT 0 NOT NULL,
	"fat" real DEFAULT 0 NOT NULL,
	"serving_size" varchar(80) DEFAULT '1 porsi' NOT NULL,
	"servings" real DEFAULT 1 NOT NULL,
	"image_url" text,
	"source" varchar(32) DEFAULT 'manual' NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "daily_calorie_goal" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_foods" ADD CONSTRAINT "custom_foods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_foods_user_id_idx" ON "custom_foods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meal_logs_user_date_idx" ON "meal_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "meal_logs_user_id_idx" ON "meal_logs" USING btree ("user_id");