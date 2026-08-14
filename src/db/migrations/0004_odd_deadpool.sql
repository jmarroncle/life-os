ALTER TABLE "life_os"."pages" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "life_os"."pages" ADD CONSTRAINT "pages_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "life_os"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pages_parent_id_idx" ON "life_os"."pages" USING btree ("parent_id");