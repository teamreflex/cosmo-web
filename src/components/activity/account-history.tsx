"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { HTMLAttributes, Suspense, useState } from "react";
import {
  CosmoActivityHistoryItem,
  CosmoActivityHistoryType,
} from "@/lib/universal/cosmo/activity/history";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import Skeleton from "../skeleton/skeleton";
import { HeartCrack } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { baseUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  artist: ValidArtist;
};

type RootHistoryType = "all" | "objekt_all" | "grid_complete" | "gravity_vote";
type ObjektHistoryType =
  | "objekt_all"
  | "objekt_purchase"
  | "objekt_receive"
  | "objekt_send";

export default function AccountHistory({ artist }: Props) {
  const today = new Date();
  const [tab, setTab] = useState<RootHistoryType>("all");
  const [historyType, setHistoryType] =
    useState<CosmoActivityHistoryType>("all");
  const [timestamp, setTimestamp] = useState<DateRange | undefined>({
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: new Date(),
  });

  function onTabChange(value: string) {
    setTab(value as RootHistoryType);
    setHistoryType(value as CosmoActivityHistoryType);
  }

  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <h1 className="text-3xl font-cosmo uppercase">History</h1>

          <Tabs value={tab} onValueChange={onTabChange} defaultValue="all">
            <TabsList className="flex justify-self-center w-fit mx-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="objekt_all">Objekt</TabsTrigger>
              <TabsTrigger value="grid_complete">Grid</TabsTrigger>
              <TabsTrigger value="gravity_vote">Gravity</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 flex flex-col gap-4 mx-auto">
        <div className="flex flex-col gap-2 items-center">
          {tab === "objekt_all" && (
            <ObjektFilter
              historyType={historyType}
              setHistoryType={setHistoryType}
            />
          )}
          <DateRangePicker value={timestamp} onValueChange={setTimestamp} />
        </div>

        <ErrorBoundary
          fallback={
            <div className="w-full flex flex-col items-center mx-auto">
              <HeartCrack className="w-12 h-12" />
              <span className="text-sm font-semibold">
                Could not load history
              </span>
            </div>
          }
        >
          <Suspense fallback={<HistoryListSkeleton />}>
            <HistoryList
              historyType={historyType}
              artist={artist}
              timestamp={timestamp}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </main>
  );
}

type HistoryListProps = {
  historyType: CosmoActivityHistoryType;
  artist: ValidArtist;
  timestamp: DateRange | undefined;
};

function HistoryList({ historyType, artist, timestamp }: HistoryListProps) {
  const { data } = useSuspenseQuery({
    queryKey: ["activity-history", artist, historyType, timestamp],
    queryFn: async () => {
      const url = new URL("/api/bff/v1/activity/history", baseUrl());
      return await ofetch<CosmoActivityHistoryItem[]>(url.toString(), {
        query: {
          artistName: artist,
          historyType,
          fromTimestamp: timestamp?.from?.toISOString() ?? "",
          toTimestamp: timestamp?.to?.toISOString() ?? "",
        },
      });
    },
  });

  const groupedResults = (data ?? []).reduce((acc, item) => {
    const date = new Date(item.timestamp);
    const formatted = format(date, "MMMM do yyyy");
    if (!acc[formatted]) {
      acc[formatted] = [];
    }
    acc[formatted].push(item);
    return acc;
  }, {} as Record<string, CosmoActivityHistoryItem[]>);

  return (
    <div className="flex flex-col gap-4">
      {data.length === 0 && (
        <p className="text-sm font-semibold mx-auto">
          No history found for this timeframe
        </p>
      )}

      {Object.entries(groupedResults).map(([month, items]) => (
        <div key={month} className="flex flex-col divide-y divide-accent gap-2">
          <h4 className="font-semibold">{month}</h4>

          {/* rows */}
          <div className="flex flex-col gap-2 py-2">
            {items.map((item, i) => (
              <div
                key={`${month}-row-${i}`}
                className="w-full flex gap-2 items-center h-16 p-4"
              >
                <div className="flex gap-4">
                  <div className="relative aspect-square size-4 mt-[2px]">
                    <Image src={item.icon} alt={item.title} fill={true} />
                  </div>

                  <div className="flex flex-col font-semibold">
                    <p className="text-sm text-muted-foreground">
                      {item.title}
                    </p>
                    <p className="text-base">{item.body}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {item.caption !== undefined
                          ? `${item.caption} | `
                          : null}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {format(item.timestamp, "h:mmaa")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryListSkeleton() {
  return (
    <div className="relative flex flex-col gap-4">
      <div className="z-20 absolute top-0 w-full h-full bg-linear-to-b from-transparent to-75% to-background" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`month-${i}`}
          className="z-10 flex flex-col divide-y divide-accent gap-2"
        >
          <Skeleton className="w-32 h-6" />

          {/* rows */}
          <div className="flex flex-col gap-2 py-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={`row-${i}`}
                className="w-full flex gap-2 items-center h-16 p-4"
              >
                <div className="flex gap-4">
                  <Skeleton className="aspect-square size-4" />

                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 py-2 w-20" />
                    <Skeleton className="h-4 py-2 w-48" />
                    <Skeleton className="h-3 py-2 w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface DateRangePickerProps extends HTMLAttributes<HTMLDivElement> {
  value: DateRange | undefined;
  onValueChange: (value: DateRange | undefined) => void;
}

function DateRangePicker({
  className,
  value,
  onValueChange,
}: DateRangePickerProps) {
  return (
    <div className={cn("w-full grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <div className="contents">
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </div>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onValueChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

type ObjektFilterProps = {
  historyType: CosmoActivityHistoryType;
  setHistoryType: (type: ObjektHistoryType) => void;
};

const filterMap: Record<ObjektHistoryType, string> = {
  objekt_all: "All",
  objekt_purchase: "Purchased",
  objekt_receive: "Received",
  objekt_send: "Sent",
};

function ObjektFilter({ historyType, setHistoryType }: ObjektFilterProps) {
  return (
    <div className="flex gap-2 items-center">
      {Object.keys(filterMap).map((type) => (
        <button
          key={type}
          className={cn(
            "rounded-full px-4 py-1 text-xs font-semibold w-fit bg-accent text-foreground transition-colors",
            historyType === type && "bg-foreground text-accent"
          )}
          onClick={() => setHistoryType(type as ObjektHistoryType)}
        >
          {filterMap[type as ObjektHistoryType]}
        </button>
      ))}
    </div>
  );
}
