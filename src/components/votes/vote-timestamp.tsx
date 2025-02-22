"use client";

import { format } from "date-fns";

type Props = {
  timestamp: Date;
};

export default function VoteTimestamp({ timestamp }: Props) {
  const formatted = format(timestamp, "MMM d yyyy h:mmaa");
  return <p className="text-xs font-medium">{formatted}</p>;
}
