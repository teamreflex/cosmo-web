"use client";

import { Error } from "@/components/error-boundary";

export default function CollectionError() {
  return <Error message="Could not load collection" />;
}