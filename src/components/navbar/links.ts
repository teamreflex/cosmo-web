import type { TablerIcon } from "@tabler/icons-react";
import type { LucideIcon } from "lucide-react";
import { PublicUser } from "@/lib/universal/auth";

export type NavbarLink = {
  name: string;
  icon: LucideIcon | TablerIcon;
  href: (user?: PublicUser) => string;
  render?: (user?: PublicUser) => React.ReactNode;
};
