"use client";

import { format } from "date-fns";

type Props = {
  at: string;
};

export default function GravityUpcomingTimestamp({ at }: Props) {
  return <p>Starts at {format(new Date(at), "MM.dd HH:mm")}</p>;
}
