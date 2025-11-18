ALTER TABLE "api_client" ADD COLUMN "api_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "api_client" ADD COLUMN "private_key_wrapped_by_password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "api_client" ADD CONSTRAINT "api_client_apiKey_unique" UNIQUE("api_key");