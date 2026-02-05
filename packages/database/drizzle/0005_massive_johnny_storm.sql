CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"user_id" integer,
	"api_client_id" integer,
	"details" text
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_api_client_id_api_client_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."api_client"("id") ON DELETE set null ON UPDATE no action;