import { db } from "@/lib/server/db";

type Props = {
  params: Promise<{
    address: string;
  }>;
};

/**
 * Endpoint for pulling a nickname from an address.
 */
export async function GET(_: Request, props: Props) {
  const { address } = await props.params;

  const result = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userAddress, address),
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
