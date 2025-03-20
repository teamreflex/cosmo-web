import Hydrated from "@/components/hydrated";
import { Moon } from "lucide-react";
import SignInDialog from "./sign-in/sign-in-dialog";
import GuestThemeSwitch from "./guest-theme-switch";
import { cn } from "@/lib/utils";

type Props = {
  hide: boolean;
};

export default function StateGuest({ hide }: Props) {
  return (
    <div className={cn("flex items-center gap-2", hide && "hidden")}>
      <SignInDialog />

      <Hydrated
        fallback={
          <div className="inline-flex items-center justify-center h-9 px-1">
            <Moon className="size-8" />
          </div>
        }
      >
        <GuestThemeSwitch />
      </Hydrated>
    </div>
  );
}
