import UserAvatar from "@/components/profile/user-avatar";
import { m } from "@/i18n/messages";

/**
 * The profile header of a deleted user's COSMO account, with nothing behind
 * it: no tabs, balances, badges, address or report button.
 */
export default function DeletedProfile() {
  return (
    <main className="relative flex flex-col">
      <div className="border-b border-border [background:radial-gradient(900px_280px_at_max(20%,calc(50%_-_460px))_0%,color-mix(in_oklch,var(--color-cosmo)_12.6%,transparent),transparent_60%)]">
        <div className="container flex flex-col gap-4 pt-6 pb-6 md:flex-row md:items-center md:gap-6">
          <UserAvatar variant="square" deleted className="size-16 md:size-22" />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="font-cosmo text-2xl leading-none font-black text-muted-foreground uppercase md:text-3xl">
              {m.common_deleted_user()}
            </h1>
            <p className="text-sm text-muted-foreground">
              {m.profile_deleted_description()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
