import UserCombobox from "@/components/user-combobox";
import { m } from "@/i18n/messages";
import { cosmoUserSearchQuery } from "@/lib/queries/user-search";
import type { SearchedCosmoUser } from "@/lib/universal/cosmo-accounts";
import type { ValidArtist } from "@apollo/cosmo/types/common";

type Props = {
  id?: string;
  // picks which of a user's profile images is shown
  artistId: ValidArtist;
  value: SearchedCosmoUser | null;
  onChange: (user: SearchedCosmoUser | null) => void;
  invalid?: boolean;
  autoFocus?: boolean;
};

/**
 * Searches COSMO users by nickname from the first character typed.
 */
export default function CosmoUserCombobox({ artistId, ...props }: Props) {
  return (
    <UserCombobox
      {...props}
      search={cosmoUserSearchQuery}
      minLength={1}
      getKey={(user) => user.address}
      getLabel={(user) => user.nickname}
      getInitial={(user) => user.nickname.charAt(0).toUpperCase()}
      getImage={(user) =>
        user.userProfiles.find((p) => p.artistId === artistId)?.image.thumbnail
      }
      placeholder={m.user_search_placeholder()}
    />
  );
}
