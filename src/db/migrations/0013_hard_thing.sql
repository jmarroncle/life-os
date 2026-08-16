CREATE TYPE "life_os"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
ALTER TABLE "life_os"."tasks" ADD COLUMN "priority" "life_os"."task_priority";--> statement-breakpoint
ALTER TABLE "life_os"."tasks" ADD COLUMN "assignees" text;