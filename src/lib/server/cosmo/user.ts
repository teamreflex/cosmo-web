import { CosmoShopUser } from "@/lib/universal/cosmo/user";
import { cosmo } from "../http";
import { cosmoShopHeaders } from "./qr-auth";

/**
 * Fetch the current user via webshop cookie.
 */
export async function user(cookie: string) {
  return await cosmo<CosmoShopUser>("/bff/v1/users/me", {
    baseURL: "https://shop.cosmo.fans",
    headers: {
      ...cosmoShopHeaders,
      Cookie: `user-session=${cookie}`,
    },
    query: {
      tid: crypto.randomUUID(),
    },
  });
}
