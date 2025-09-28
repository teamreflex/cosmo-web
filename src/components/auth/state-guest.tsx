import { Moon } from "lucide-react";
import GuestThemeSwitch from "../navbar/guest-theme-switch";
import ArtistSelectbox from "../navbar/artist-selectbox";
import SignIn from "./sign-in";
import Hydrated from "@/components/hydrated";

export default function StateGuest() {
  return (
    <div className="flex items-center gap-2">
      <SignIn />

      <div className="hidden md:contents">
        <Hydrated
          fallback={
            <div className="inline-flex h-9 items-center justify-center px-1">
              <Moon className="size-8" />
            </div>
          }
        >
          <GuestThemeSwitch />
        </Hydrated>

        <ArtistSelectbox />
      </div>
    </div>
  );
}
