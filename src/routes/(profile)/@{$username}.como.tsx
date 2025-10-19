import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import CurrentMonth from "@/components/como/current-month";
import { Error } from "@/components/error-boundary";
import { seoTitle } from "@/lib/seo";
import { artistsQuery, targetAccountQuery } from "@/lib/queries/core";
import { fetchObjektsWithComoQuery } from "@/lib/queries/como";
import ArtistIcon from "@/components/artist-icon";
import ComoCalendar from "@/components/como/calendar";
import Portal from "@/components/portal";
import HelpDialog from "@/components/como/help-dialog";

export const Route = createFileRoute("/(profile)/@{$username}/como")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  loader: async ({ context, params }) => {
    const [target, artists] = await Promise.all([
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
      context.queryClient.ensureQueryData(artistsQuery),
    ]);

    await context.queryClient.ensureQueryData(
      fetchObjektsWithComoQuery(target.cosmo.address),
    );

    return { target, artists };
  },
  head: ({ loaderData }) => ({
    meta: [
      seoTitle(
        loaderData?.target.user
          ? `${loaderData.target.user.username}'s COMO`
          : `COMO`,
      ),
    ],
  }),
});

function RouteComponent() {
  const { target, artists } = Route.useLoaderData();
  const { data } = useSuspenseQuery(
    fetchObjektsWithComoQuery(target.cosmo.address),
  );

  const totals = artists.map((artist) => {
    const total = data
      .filter((t) => t.artistId === artist.id.toLowerCase())
      .reduce((sum, objekt) => {
        return sum + objekt.amount;
      }, 0);

    return { artist, total };
  });

  return (
    <main className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="flex w-full items-center justify-between gap-2">
          <CurrentMonth />

          <div className="flex items-center gap-4">
            {totals.map((total) => (
              <div className="flex items-center gap-1" key={total.artist.name}>
                <ArtistIcon artist={total.artist.name} />
                <span className="font-semibold">
                  +{total.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ComoCalendar artists={artists} transfers={data} />

      <Portal to="#help">
        <HelpDialog />
      </Portal>
    </main>
  );
}

function PendingComponent() {
  const cells = Array.from(
    { length: getCellCount(new Date()) },
    (_, i) => i + 1,
  );

  return (
    <main className="flex flex-col gap-2">
      <CurrentMonth />

      <div className="flex h-fit flex-col overflow-hidden rounded-lg border border-secondary bg-secondary text-clip">
        {/* days of the week */}
        <div className="grid grid-cols-7 gap-px border-b border-secondary">
          <div className="flex items-center justify-center bg-background/80 py-2 font-bold">
            Mon
          </div>
          <div className="flex items-center justify-center bg-background/80 py-2 font-bold">
            Tue
          </div>
          <div className="flex items-center justify-center bg-background/80 py-2 font-bold">
            Wed
          </div>
          <div className="flex items-center justify-center bg-background/80 py-2 font-bold">
            Thu
          </div>
          <div className="flex items-center justify-center bg-background/80 py-2 font-bold">
            Fri
          </div>
          <div className="flex items-center justify-center bg-background/80 py-2 font-bold">
            Sat
          </div>
          <div className="flex items-center justify-center bg-background/80 py-2 font-bold">
            Sun
          </div>
        </div>

        {/* days of the month */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day) => (
            <div
              key={day}
              className="relative flex h-24 animate-pulse items-center justify-center bg-background/70 transition-colors hover:bg-background/50 sm:h-20"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message="Could not load COMO calendar" />;
}

/**
 * Get the number of cells needed for the current month.
 */
function getCellCount(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1;
  const lastDate = new Date(year, month + 1, 0).getDate();
  return Math.ceil((firstDayIndex + lastDate) / 7) * 7;
}
