import { getCookie } from "@/lib/server/cookies";
import { readToken } from "@/lib/server/jwt";
import { TokenPayload } from "@/lib/universal/auth";

type AuthenticationResult =
  | {
      success: true;
      user: TokenPayload;
    }
  | {
      success: false;
      error: string;
      status: number;
    };

export async function getUser(): Promise<AuthenticationResult> {
  const token = getCookie("token");
  if (!token) {
    return {
      success: false,
      status: 401,
      error: "unauthorized",
    };
  }
  const user = await readToken(token);
  if (!user) {
    return {
      success: false,
      status: 401,
      error: "unauthorized",
    };
  }

  return { success: true, user };
}
