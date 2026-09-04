CREATE TABLE "life_os"."team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"activation_token" text NOT NULL,
	"push_subscription" jsonb,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_os"."tasks" ADD COLUMN "derived_to_member_id" uuid;--> statement-breakpoint
ALTER TABLE "life_os"."tasks" ADD COLUMN "derived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "life_os"."team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "life_os"."team_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_activation_token_idx" ON "life_os"."team_members" USING btree ("activation_token");--> statement-breakpoint
ALTER TABLE "life_os"."tasks" ADD CONSTRAINT "tasks_derived_to_member_id_team_members_id_fk" FOREIGN KEY ("derived_to_member_id") REFERENCES "life_os"."team_members"("id") ON DELETE set null ON UPDATE no action;