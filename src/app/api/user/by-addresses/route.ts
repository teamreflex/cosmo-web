import { env } from "@/env";
import { db } from "@/lib/server/db";
import { z } from "zod";

const schema = z.object({
  addresses: z
    .array(z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"))
    .min(1, "At least one address is required")
    .max(250, "Maximum 250 addresses allowed"),
});

/**
 * Endpoint for getting a list of usernames by a list of addresses.
 */
export async function POST(req: Request) {
  const authKey = req.headers.get("Authorization");
  if (authKey !== env.AUTH_KEY) {
    return Response.json({ error: "invalid authorization" }, { status: 401 });
  }

  try {
    const body: unknown = await req.json();
    const { addresses } = schema.parse(body);

    const accounts = await db.query.cosmoAccounts.findMany({
      where: {
        address: {
          in: addresses,
        },
      },
      columns: {
        username: true,
        address: true,
        polygonAddress: true,
      },
    });

    return Response.json({ accounts });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "validation error", details: error.errors },
        { status: 422 }
      );
    }

    return Response.json({ error: "internal server error" }, { status: 500 });
  }
}
