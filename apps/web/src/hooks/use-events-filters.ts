import { type FilterUpdate, resolveUpdate } from "@/lib/client/filters";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { EventTypeKey } from "@apollo/database/web/types";
import { useNavigate, useSearch } from "@tanstack/react-router";

export function useEventsFilters() {
  const navigate = useNavigate({ from: "/events/" });
  const searchParams = useSearch({ from: "/events/" });

  const setFilters = (input: FilterUpdate<EventsFilters>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...resolveUpdate(input, searchParams),
      }),
      replace: true,
    });
  };

  return {
    filters: searchParams,
    setFilters,
  };
}

export type EventsFilters = {
  sort?: "newest" | "oldest";
  artist?: ValidArtist;
  season?: string[];
  era?: string;
  type?: EventTypeKey;
};

export type SetEventsFilters = (input: FilterUpdate<EventsFilters>) => void;
