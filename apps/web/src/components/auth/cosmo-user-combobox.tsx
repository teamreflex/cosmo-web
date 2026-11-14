import UserCombobox from "@/components/user-combobox";
import { m } from "@/i18n/messages";
import { cosmoUserSearchQuery } from "@/lib/queries/user-search";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";

type Props = {
  id?: string;
  // picks which of a user's profile images is shown
  artistId: ValidArtist;
  value: CosmoPublicUser | null;
  onChange: (user: CosmoPublicUser | null) => void;
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
