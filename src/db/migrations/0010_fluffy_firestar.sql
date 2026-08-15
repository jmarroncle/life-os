CREATE TABLE "life_os"."mcp_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"success" boolean NOT NULL,
	"summary" text,
	"duration_ms" integer NOT NULL,
	"estimated_tokens_in" integer NOT NULL,
	"estimated_tokens_out" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_os"."mcp_calls" ADD CONSTRAINT "mcp_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_calls_user_id_idx" ON "life_os"."mcp_calls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_calls_created_at_idx" ON "life_os"."mcp_calls" USING btree ("created_at");