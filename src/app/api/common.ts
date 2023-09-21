import { TokenPayload, readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";

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
  const token = cookies().get("token");
  if (!token) {
    return {
      success: false,
      status: 401,
      error: "unauthorized",
    };
  }
  const user = await readToken(token.value);
  if (!user) {
    return {
      success: false,
      status: 401,
      error: "unauthorized",
    };
  }

  return { success: true, user };
}
