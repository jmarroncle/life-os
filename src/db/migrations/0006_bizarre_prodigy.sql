CREATE TYPE "life_os"."database_column_type" AS ENUM('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url');--> statement-breakpoint
CREATE TABLE "life_os"."database_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"database_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "life_os"."database_column_type" DEFAULT 'text' NOT NULL,
	"options" text[],
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "life_os"."database_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"database_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "life_os"."databases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_os"."database_columns" ADD CONSTRAINT "database_columns_database_id_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "life_os"."databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_os"."database_columns" ADD CONSTRAINT "database_columns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_os"."database_rows" ADD CONSTRAINT "database_rows_database_id_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "life_os"."databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_os"."database_rows" ADD CONSTRAINT "database_rows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_os"."databases" ADD CONSTRAINT "databases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "database_columns_database_id_idx" ON "life_os"."database_columns" USING btree ("database_id");--> statement-breakpoint
CREATE INDEX "database_rows_database_id_idx" ON "life_os"."database_rows" USING btree ("database_id");--> statement-breakpoint
CREATE INDEX "databases_user_id_idx" ON "life_os"."databases" USING btree ("user_id");