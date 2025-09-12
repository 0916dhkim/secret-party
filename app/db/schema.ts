import { relations } from "drizzle-orm";
import { text, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

export const userTable = pgTable("user", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
});

export const userRelations = relations(userTable, ({ many }) => ({
  projects: many(projectTable),
}));

export const projectTable = pgTable("project", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ownerId: integer()
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});

export const projectRelations = relations(projectTable, ({ one, many }) => ({
  owner: one(userTable),
  environments: many(environmentTable),
}));

export const environmentTable = pgTable("environment", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  projectId: integer()
    .notNull()
    .references(() => projectTable.id, { onDelete: "cascade" }),
  dekWrappedByPassword: text().notNull(),
});

export const environmentRelations = relations(
  environmentTable,
  ({ one, many }) => ({
    project: one(projectTable),
    secrets: many(secretTable),
    access: many(environmentAccessTable),
  })
);

export const secretTable = pgTable(
  "secret",
  {
    environmentId: integer()
      .notNull()
      .references(() => environmentTable.id, { onDelete: "cascade" }),
    key: text().notNull(),
    valueEncrypted: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.environmentId, table.key] })]
);

export const secretRelations = relations(secretTable, ({ one }) => ({
  environment: one(environmentTable),
}));

export const apiClientTable = pgTable("api_client", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  publicKey: text().notNull(),
});

export const apiClientRelations = relations(apiClientTable, ({ many }) => ({
  access: many(environmentAccessTable),
}));

export const environmentAccessTable = pgTable(
  "environment_access",
  {
    environmentId: integer()
      .notNull()
      .references(() => environmentTable.id, { onDelete: "cascade" }),
    clientId: integer()
      .notNull()
      .references(() => apiClientTable.id, { onDelete: "cascade" }),
    dekWrappedByClientPublicKey: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.environmentId, table.clientId] })]
);

export const environmentAccessRelations = relations(
  environmentAccessTable,
  ({ one }) => ({
    environment: one(environmentTable),
    client: one(apiClientTable),
  })
);
