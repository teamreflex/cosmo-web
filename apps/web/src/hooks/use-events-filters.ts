import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { EventTypeKey } from "@apollo/database/web/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

export function useEventsFilters() {
  const navigate = useNavigate({ from: "/events/" });
  const searchParams = useSearch({ from: "/events/" });

  const setFilters = useCallback(
    (
      input:
        | Partial<EventsFilters>
        | ((prev: EventsFilters) => Partial<EventsFilters>),
    ) => {
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the updater-function union, standard setState pattern
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
