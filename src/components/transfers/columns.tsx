"use client";

import { AggregatedTransfer } from "@/lib/universal/transfers";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";

const ch = createColumnHelper<AggregatedTransfer>();
export const columns: ColumnDef<AggregatedTransfer>[] = [
  ch.display({
    header: "From",
    id: "from",
    cell: ({ row }) => row.original.transfer.from,
  }),
  ch.display({
    header: "To",
    id: "to",
    cell: ({ row }) => row.original.transfer.to,
  }),
  ch.display({
    header: "Timestamp",
    id: "timestamp",
    cell: ({ row }) => {
      const datetime = format(
        Date.parse(row.original.transfer.timestamp),
        "dd/MM/yy h:mmaa"
      );
      return <span>{datetime}</span>;
    },
  }),
  ch.display({
    header: "Objekt",
    id: "objekt",
    cell: ({ row }) => row.original.collection?.collectionId ?? "Unknown",
  }),
];
