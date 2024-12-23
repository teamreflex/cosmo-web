import { TokenPayload } from "@/lib/universal/auth";
import type { TablerIcon } from "@tabler/icons-react";
import type { LucideIcon } from "lucide-react";

export type NavbarLink = {
  name: string;
  icon: LucideIcon | TablerIcon;
  href: (user?: TokenPayload) => string;
  requireAuth: boolean;
  prefetch: boolean | null;
};
