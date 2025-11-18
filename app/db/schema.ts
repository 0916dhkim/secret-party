import { relations } from "drizzle-orm";
import {
  text,
  integer,
  pgTable,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";

export const userTable = pgTable("user", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
});

export const userRelations = relations(userTable, ({ many }) => ({
  projects: many(projectTable),
  sessions: many(sessionTable),
  apiClients: many(apiClientTable),
}));

export const sessionTable = pgTable("session", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));

export const projectTable = pgTable("project", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  ownerId: integer()
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});

export const projectRelations = relations(projectTable, ({ one, many }) => ({
  owner: one(userTable, {
    fields: [projectTable.ownerId],
    references: [userTable.id],
  }),
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
    project: one(projectTable, {
      fields: [environmentTable.projectId],
      references: [projectTable.id],
    }),
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
  environment: one(environmentTable, {
    fields: [secretTable.environmentId],
    references: [environmentTable.id],
  }),
}));

export const apiClientTable = pgTable("api_client", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  apiKey: text().notNull().unique(),
  publicKey: text().notNull().unique(),
  privateKeyWrappedByPassword: text().notNull(),
  userId: integer()
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});

export const apiClientRelations = relations(
  apiClientTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [apiClientTable.userId],
      references: [userTable.id],
    }),
    access: many(environmentAccessTable),
  })
);

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
    environment: one(environmentTable, {
      fields: [environmentAccessTable.environmentId],
      references: [environmentTable.id],
    }),
    client: one(apiClientTable, {
      fields: [environmentAccessTable.clientId],
      references: [apiClientTable.id],
    }),
  })
);
