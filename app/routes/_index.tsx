import { css } from "@flow-css/core/css";
import { db } from "../db/db";

export async function loader() {
  const users = await db.query.userTable.findMany();
  console.log(users);
  return users;
}

export default function Home() {
  return <div className={css({ background: "red" })}>HI</div>;
}
