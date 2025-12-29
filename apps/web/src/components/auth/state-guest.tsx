import Hydrated from "@/components/hydrated";
import { IconLanguage } from "@tabler/icons-react";
import ArtistSelectbox from "../navbar/artist-selectbox";
import GuestSettings from "../navbar/guest-settings";
import SignIn from "./sign-in";

export default function StateGuest() {
  return (
    <div className="flex items-center gap-2">
      <SignIn />

      <div className="hidden md:contents">
        <Hydrated
          fallback={<IconLanguage className="size-6 shrink-0 drop-shadow-lg" />}
        >
          <GuestSettings />
        </Hydrated>

        <ArtistSelectbox />
      </div>
    </div>
  );
}
