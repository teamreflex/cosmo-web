import { m } from "@/i18n/messages";
import { adminEventsQuery } from "@/lib/queries/events";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import EventCard from "./event-card";

const route = getRouteApi("/admin/events");

export default function EventsGrid() {
  const { artists } = route.useLoaderData();
  const { data: eventsList } = useSuspenseQuery(adminEventsQuery());

  if (eventsList.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {m.admin_no_events()}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {eventsList.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          artist={artists[event.artist]}
        />
      ))}
    </div>
  );
}
