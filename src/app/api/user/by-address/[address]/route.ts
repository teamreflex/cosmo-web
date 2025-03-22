import { env } from "@/env";
import { db } from "@/lib/server/db";

type Props = {
  params: Promise<{
    address: string;
  }>;
};

/**
 * Endpoint for pulling a nickname from an address.
 */
export async function GET(req: Request, props: Props) {
  const authKey = req.headers.get("Authorization");
  if (authKey !== env.AUTH_KEY) {
    return Response.json({ error: "invalid authorization" }, { status: 401 });
  }

  const { address } = await props.params;

  const result = await db.query.profiles.findFirst({
    where: {
      userAddress: address,
    },
  });

  if (!result) {
    return Response.json({
      result: null,
    });
  }

  return Response.json({
    result: {
      nickname: result.nickname,
      address: result.userAddress,
    },
  });
}
