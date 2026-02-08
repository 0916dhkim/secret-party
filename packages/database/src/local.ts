export const localDb = {
  user: "secretparty",
  password: "secretparty",
  database: "secretparty",
  host: "localhost",
  port: 5432,
};

export const LOCAL_DATABASE_URL =
  `postgresql://${localDb.user}:${localDb.password}@${localDb.host}:${localDb.port}/${localDb.database}`;
