CREATE TABLE "api_client" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_client_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"public_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environment_access" (
	"environment_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"dek_wrapped_by_client_public_key" text NOT NULL,
	CONSTRAINT "environment_access_environment_id_client_id_pk" PRIMARY KEY("environment_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "environment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "environment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"project_id" integer NOT NULL,
	"dek_wrapped_by_password" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret" (
	"environment_id" integer NOT NULL,
	"key" text NOT NULL,
	"value_encrypted" text NOT NULL,
	CONSTRAINT "secret_environment_id_key_pk" PRIMARY KEY("environment_id","key")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "environment_access" ADD CONSTRAINT "environment_access_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_access" ADD CONSTRAINT "environment_access_client_id_api_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."api_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment" ADD CONSTRAINT "environment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;