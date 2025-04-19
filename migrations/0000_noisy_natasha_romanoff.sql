CREATE TABLE IF NOT EXISTS "hedges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"base_currency" text NOT NULL,
	"target_currency" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"rate" numeric(10, 6) NOT NULL,
	"duration" integer NOT NULL,
	"margin" numeric(10, 2),
	"status" text NOT NULL,
	"broker" text DEFAULT 'tickmill',
	"trade_order_number" text,
	"trade_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"ticket" text NOT NULL,
	"broker" text NOT NULL,
	"volume" numeric(10, 2) NOT NULL,
	"symbol" text NOT NULL,
	"open_time" timestamp NOT NULL,
	"duration_days" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_at" timestamp,
	"hedge_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hedges" ADD CONSTRAINT "hedges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trades" ADD CONSTRAINT "trades_hedge_id_hedges_id_fk" FOREIGN KEY ("hedge_id") REFERENCES "public"."hedges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
