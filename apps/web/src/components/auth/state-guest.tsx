import { IconLanguage } from "@tabler/icons-react";
import GuestSettings from "../navbar/guest-settings";
import ArtistSelectbox from "../navbar/artist-selectbox";
import SignIn from "./sign-in";
import Hydrated from "@/components/hydrated";

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
