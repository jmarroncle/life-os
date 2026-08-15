CREATE TABLE "life_os"."page_database_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"database_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_os"."page_database_links" ADD CONSTRAINT "page_database_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_os"."page_database_links" ADD CONSTRAINT "page_database_links_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "life_os"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_os"."page_database_links" ADD CONSTRAINT "page_database_links_database_id_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "life_os"."databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_database_links_page_id_idx" ON "life_os"."page_database_links" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_database_links_database_id_idx" ON "life_os"."page_database_links" USING btree ("database_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_database_links_page_database_idx" ON "life_os"."page_database_links" USING btree ("page_id","database_id");