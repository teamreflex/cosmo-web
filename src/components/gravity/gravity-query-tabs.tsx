"use client";

import { Tabs } from "@/components/ui/tabs";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { PropsWithChildren } from "react";

const options = ["result", "live", "my"] as const;
type Option = (typeof options)[number];

type Props = PropsWithChildren<{
  defaultValue: Option;
  className?: string;
}>;

export default function GravityQueryTabs({
  children,
  defaultValue,
  className,
}: Props) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(options).withDefault(defaultValue)
  );

  return (
    <Tabs
      className={className}
      value={tab}
      onValueChange={(value) => setTab(value as Option)}
    >
      {children}
    </Tabs>
  );
}
