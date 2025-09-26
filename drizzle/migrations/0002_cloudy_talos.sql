ALTER TABLE "atlas_sessions" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "atlas_users" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "atlas_users" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "atlas_users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "atlas_users" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
UPDATE "atlas_users" SET "role" = 'admin' WHERE "id" = (SELECT "id" FROM "atlas_users" ORDER BY "created_at" ASC LIMIT 1);