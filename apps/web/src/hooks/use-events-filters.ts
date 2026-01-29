import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { EventTypeKey } from "@apollo/database/web/types";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";

const route = getRouteApi("/events/");

export function useEventsFilters() {
  const navigate = route.useNavigate();
  const searchParams = route.useSearch();

  const setFilters = useCallback(
    (
      input:
        | Partial<EventsFilters>
        | ((prev: EventsFilters) => Partial<EventsFilters>),
    ) => {
      if (typeof input === "function") {
        input = input(searchParams);
      }

      void navigate({
        search: (prev) => ({
          ...prev,
          ...input,
        }),
        replace: true,
      });
    },
    [navigate, searchParams],
  );

  const setFilter = useCallback(
    (key: keyof EventsFilters, value: EventsFilters[keyof EventsFilters]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

  return {
    filters: searchParams,
    setFilters,
    setFilter,
  };
}

export type EventsFilters = {
  sort?: "newest" | "oldest";
  artist?: ValidArtist;
  season?: string[];
  era?: string;
  type?: EventTypeKey;
};

export type SetEventsFilters = (
  input:
    | Partial<EventsFilters>
    | ((prev: EventsFilters) => Partial<EventsFilters>),
) => void;
