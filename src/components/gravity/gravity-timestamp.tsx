"use client";

import { format } from "date-fns";

type Props = {
  start: string;
  end: string;
};

export default function GravityTimestamp({ start, end }: Props) {
  return (
    <span>
      {format(new Date(start), "yy.MM.dd")} - {format(new Date(end), "MM.dd")}
    </span>
  );
}
