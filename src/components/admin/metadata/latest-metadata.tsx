import { db } from "@/lib/server/db";

export default async function LatestMetadata() {
  const metadata = await db.query.objektMetadata.findMany({
    orderBy: {
      id: "desc",
    },
    limit: 10,
  });

  return (
    <div className="flex flex-col text-sm border border-accent rounded-md">
      {metadata.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[20%_70%] border-b border-accent p-1 last:border-0"
        >
          <p className="font-semibold">{row.collectionId}</p>
          <p>{row.description}</p>
        </div>
      ))}
    </div>
  );
}
