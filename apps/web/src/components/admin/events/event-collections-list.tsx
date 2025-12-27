import { useSuspenseQuery } from "@tanstack/react-query";
import DeleteCollection from "./delete-collection";
import { eventCollectionsQuery } from "@/lib/queries/events";
import { m } from "@/i18n/messages";

type Props = {
  eventId: string;
};

export default function EventCollectionsList({ eventId }: Props) {
  const { data } = useSuspenseQuery(eventCollectionsQuery(eventId));

  if (data.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {m.admin_no_collections()}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">{m.admin_event_collections()}</h3>
      <div className="flex flex-col rounded-md border border-accent text-sm">
        {data.map((col) => (
          <div
            key={col.id}
            className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-b border-accent p-2 last:border-0"
          >
            <span className="font-semibold">{col.collectionId}</span>
            <span className="text-muted-foreground">
              {col.description || "-"}
            </span>
            <DeleteCollection
              eventId={eventId}
              collectionId={col.collectionId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
