import Hydrated from "@/components/hydrated";
import { Moon } from "lucide-react";
import SignInDialog from "./sign-in/sign-in-dialog";
import GuestThemeSwitch from "./guest-theme-switch";

export default function StateGuest() {
  return (
    <div className="flex items-center gap-2">
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
