"use client";

import { Error } from "@/components/error-boundary";

export default function VotingError() {
  return <Error message="Could not load voting history" />;
}
