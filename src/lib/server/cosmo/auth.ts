import { CosmoByNicknameResult } from "@/lib/universal/cosmo/auth";
import { cosmo } from "../http";

/**
 * Fetch a user from COSMO by nickname.
 */
export async function fetchByNickname(nickname: string) {
  return await cosmo<CosmoByNicknameResult>(
    `/user/v1/by-nickname/${nickname}`,
    {
      retry: false,
    }
  ).then((res) => res.profile);
}
