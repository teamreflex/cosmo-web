import { TokenPayload } from "@/lib/universal/auth";
import { LucideIcon } from "lucide-react";

export type NavbarLink = {
  name: string;
  icon: LucideIcon;
  href: (user?: TokenPayload) => string;
  requireAuth: boolean;
  prefetch: boolean | undefined;
};
