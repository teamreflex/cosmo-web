import { pins } from "@apollo/database/web/schema";
import { sql } from "drizzle-orm";

/**
 * A position in front of every pin the address has, so a new pin shows first.
 */
export function frontPinPosition(address: string) {
  return sql<number>`COALESCE((SELECT MIN(${pins.position}) FROM ${pins} WHERE ${pins.address} = ${address}), 0) - 1`;
}
