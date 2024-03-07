import users from "./users.json";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import * as schema from "./planetscale-migrate/schema";

dotenv.config({
  path: ".env.local",
});

// create the connection
const connection = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

const db = drizzle(connection, {
  schema,
});

const artist = "artms" as const;
const result = await db.insert(schema.profiles).values(
  users.map((u) => ({
    nickname: u.nickname,
    userAddress: u.userAddress,
    cosmoId: 0,
    artist,
  }))
);

console.log(result.rowsAffected);
