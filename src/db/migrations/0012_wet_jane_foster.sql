CREATE TYPE "life_os"."content_review_status" AS ENUM('draft', 'reviewed');--> statement-breakpoint
ALTER TABLE "life_os"."database_rows" ADD COLUMN "review_status" "life_os"."content_review_status" DEFAULT 'reviewed' NOT NULL;--> statement-breakpoint
ALTER TABLE "life_os"."pages" ADD COLUMN "review_status" "life_os"."content_review_status" DEFAULT 'reviewed' NOT NULL;--> statement-breakpoint
CREATE INDEX "database_rows_review_status_idx" ON "life_os"."database_rows" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "pages_review_status_idx" ON "life_os"."pages" USING btree ("review_status");