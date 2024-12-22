import { TokenPayload } from "@/lib/universal/auth";
import { IconType } from "react-icons/lib";

export type NavbarLink = {
  name: string;
  icon: IconType;
  href: (user?: TokenPayload) => string;
  requireAuth: boolean;
};
