CREATE TABLE "life_os"."undo_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"inverse_ops" jsonb NOT NULL,
	"undone_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_os"."undo_log" ADD CONSTRAINT "undo_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "undo_log_user_id_idx" ON "life_os"."undo_log" USING btree ("user_id");