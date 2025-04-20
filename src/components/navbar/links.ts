import type { TablerIcon } from "@tabler/icons-react";
import type { LucideIcon } from "lucide-react";

export type NavbarLink = {
  name: string;
  icon: LucideIcon | TablerIcon;
  href: string;
  prefetch: boolean | null;
};
