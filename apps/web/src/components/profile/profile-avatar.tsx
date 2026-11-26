import ResponsiveSheet, { SheetFill } from "@/components/responsive-sheet";
import { m } from "@/i18n/messages";
import { lazyWithPreload } from "@/lib/lazy";
import { currentAccountQuery } from "@/lib/queries/core";
import { IconCamera } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { PickerFallback } from "../objekt-picker/picker-grid";
import UserAvatar from "./user-avatar";

const AvatarEditor = lazyWithPreload(() => import("./avatar-editor"));

const route = getRouteApi("/@{$username}");

type Props = {
  username: string;
  avatar: string | null;
  /**
   * The viewer's own COSMO address when this is their profile, which makes
   * the picture a button that changes it.
   */
  ownerAddress: string | null;
};

/**
 * The picture heading a profile. Its owner clicks it to pick one of their
 * objekts and crop a new picture from it.
 */
export default function ProfileAvatar({
  username,
  avatar,
  ownerAddress,
}: Props) {
  return ownerAddress === null ? (
    <UserAvatar
      className="size-16 md:size-22"
      username={username}
      avatar={avatar}
      priority
    />
  ) : (
    <OwnAvatar username={username} avatar={avatar} address={ownerAddress} />
  );
}

function OwnAvatar({
  username,
  avatar,
  address,
}: {
  username: string;
  avatar: string | null;
  address: string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const targetAccountOptions = route.useRouteContext({
    select: (context) => context.targetAccountOptions,
  });

  /**
   * The picture rides on both account queries, which never go stale on their
   * own, and the profile's loader returns them.
   */
  async function refresh() {
    setOpen(false);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: currentAccountQuery.queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: targetAccountOptions.queryKey,
      }),
    ]);
    await router.invalidate();
  }

  return (
    <>
      <button
        type="button"
        aria-label={m.profile_avatar_change()}
        onClick={() => setOpen(true)}
        onPointerEnter={AvatarEditor.preload}
        onFocus={AvatarEditor.preload}
        className="group relative w-fit shrink-0 cursor-pointer rounded-full outline-2 outline-offset-2 outline-transparent transition-[outline-color] focus-visible:outline-cosmo"
      >
        <UserAvatar
          className="size-16 md:size-22"
          username={username}
          avatar={avatar}
          priority
        />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <IconCamera className="size-6" />
        </span>
        {/* a touch screen has no hover to reveal the overlay, so the badge is its cue */}
        <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-foreground text-background ring-2 ring-background [@media(hover:hover)]:hidden">
          <IconCamera className="size-3.5" />
        </span>
      </button>

      <ResponsiveSheet
        title={m.profile_avatar_title()}
        narrow
        tall
        open={open}
        onOpenChange={setOpen}
      >
        <SheetFill>
          <Suspense fallback={<PickerFallback />}>
            <AvatarEditor
              address={address}
              username={username}
              hasPicture={avatar !== null}
              onSaved={refresh}
            />
          </Suspense>
        </SheetFill>
      </ResponsiveSheet>
    </>
  );
}
