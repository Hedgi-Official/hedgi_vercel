ALTER TABLE "trades" DROP CONSTRAINT "trades_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "trades" DROP CONSTRAINT "trades_hedge_id_hedges_id_fk";
--> statement-breakpoint
ALTER TABLE "hedges" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "hedges" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "flask_trade_id" integer;--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "enable_rls" boolean DEFAULT false NOT NULL;