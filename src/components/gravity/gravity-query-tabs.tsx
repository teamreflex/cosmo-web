"use client";

import { Tabs } from "@/components/ui/tabs";
import { parseAsString, useQueryState } from "nuqs";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  defaultValue: string;
  className?: string;
}>;

export default function GravityQueryTabs({
  children,
  defaultValue,
  className,
}: Props) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault(defaultValue)
  );

  return (
    <Tabs className={className} value={tab} onValueChange={setTab}>
      {children}
    </Tabs>
  );
}
