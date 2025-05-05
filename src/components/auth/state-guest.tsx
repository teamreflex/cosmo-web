import Hydrated from "@/components/hydrated";
import { Moon } from "lucide-react";
import SignIn from "./sign-in";
import GuestThemeSwitch from "../navbar/guest-theme-switch";
import ArtistSelectbox from "../navbar/artist-selectbox";

export default function StateGuest() {
  return (
    <div className="flex items-center gap-2">
      <SignIn />

      <div className="hidden md:contents">
        <Hydrated
          fallback={
            <div className="inline-flex items-center justify-center h-9 px-1">
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
