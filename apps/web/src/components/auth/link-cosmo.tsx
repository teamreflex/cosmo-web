import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { artistsQuery, currentAccountQuery } from "@/lib/queries/core";
import { artistColors, cn, track } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import { IconCheck, IconCircleCheck, IconLoader2 } from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { $generateVerificationCode, $verifyCosmoBio } from "./actions";
import CosmoUserCombobox from "./cosmo-user-combobox";

type WizardState =
  | { step: "info" }
  | { step: "artist" }
  | { step: "search"; artistId: ValidArtist }
  | { step: "code"; artistId: ValidArtist; user: CosmoPublicUser; code: string }
  | {
      step: "success";
      artistId: ValidArtist;
      user: CosmoPublicUser;
    };

export default function LinkCosmo() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="cosmo">
          <img
            src="/cosmo.webp"
            alt={m.common_cosmo()}
            className="aspect-square size-5 rounded-full"
          />
          <span>{m.link_cosmo_title()}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="focus-visible:outline-none">
        <DialogHeader>
          <DialogTitle>{m.link_cosmo_title()}</DialogTitle>
          <DialogDescription>
            {m.link_cosmo_description({ appName: env.VITE_APP_NAME })}
          </DialogDescription>
        </DialogHeader>

        <LinkCosmoWizard onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type LinkCosmoWizardProps = {
  onClose: () => void;
};

function LinkCosmoWizard({ onClose }: LinkCosmoWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<WizardState>({ step: "info" });

  function handleClose() {
    toast.success(m.link_cosmo_success());
    void router.invalidate();
    void queryClient.invalidateQueries({
      queryKey: currentAccountQuery.queryKey,
    });
    onClose();
  }

  function getProfileImage(
    user: CosmoPublicUser,
    artistId: ValidArtist,
  ): string | undefined {
    return user.userProfiles.find((p) => p.artistId === artistId)?.image
      .thumbnail;
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {state.step === "info" && (
        <InfoStep onContinue={() => setState({ step: "artist" })} />
      )}

      {state.step === "artist" && (
        <Suspense
          fallback={
            <div className="flex w-full flex-col gap-4">
              <Skeleton className="mx-auto h-5 w-48" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <Skeleton className="mx-auto h-9 w-24" />
            </div>
          }
        >
          <ArtistStep
            onContinue={(artistId) => setState({ step: "search", artistId })}
          />
        </Suspense>
      )}

      {state.step === "search" && (
        <SearchStep
          artistId={state.artistId}
          onContinue={(user, code) =>
            setState({ step: "code", artistId: state.artistId, user, code })
          }
        />
      )}

      {state.step === "code" && (
        <CodeStep
          user={state.user}
          artistId={state.artistId}
          code={state.code}
          onSuccess={() => {
            track("cosmo-link");
            setState({
              step: "success",
              artistId: state.artistId,
              user: state.user,
            });
          }}
          onBack={() => setState({ step: "search", artistId: state.artistId })}
        />
      )}

      {state.step === "success" && (
        <SuccessStep
          nickname={state.user.nickname}
          profileImage={getProfileImage(state.user, state.artistId)}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

type InfoStepProps = {
  onContinue: () => void;
};

function InfoStep({ onContinue }: InfoStepProps) {
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      <p>{m.link_cosmo_how_it_works()}</p>
      <p>{m.link_cosmo_features()}</p>
      <p>{m.link_cosmo_privacy({ appName: env.VITE_APP_NAME })}</p>
      <p>{m.link_cosmo_permanent()}</p>

      <Button className="mx-auto mt-4 w-fit" onClick={onContinue}>
        {m.common_start()}
      </Button>
    </div>
  );
}

type ArtistStepProps = {
  onContinue: (artistId: ValidArtist) => void;
};

function ArtistStep({ onContinue }: ArtistStepProps) {
  const { data } = useSuspenseQuery(artistsQuery);
  const artists = Object.values(data.artists);
  const [selected, setSelected] = useState<ValidArtist | null>(null);

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        {m.link_cosmo_select_artist()}
      </p>

      <div className="flex flex-col gap-2">
        {artists.map((artist) => {
          return (
            <button
              key={artist.id}
              type="button"
              onClick={() => setSelected(artist.id)}
              style={{ "--artist-color": artistColors[artist.id] }}
              className={cn(
                "flex items-center gap-3 overflow-hidden rounded-lg p-3 ring-3 ring-transparent transition-all",
                selected === artist.id && "ring-(--artist-color)",
              )}
            >
              <img
                src={artist.logoImageUrl}
                alt={artist.title.at(0)}
                className="aspect-square size-8 shrink-0 rounded-full"
              />
              <span className="font-medium">{artist.title}</span>
            </button>
          );
        })}
      </div>

      <Button
        className="mx-auto w-fit"
        onClick={() => selected && onContinue(selected)}
        disabled={!selected}
      >
        {m.common_continue()}
      </Button>
    </div>
  );
}

type SearchStepProps = {
  artistId: ValidArtist;
  onContinue: (user: CosmoPublicUser, code: string) => void;
};

function SearchStep({ artistId, onContinue }: SearchStepProps) {
  const [selected, setSelected] = useState<CosmoPublicUser | null>(null);
  const { mutate, isPending } = useMutation({
    mutationFn: $generateVerificationCode,
  });

  function handleSelect() {
    if (!selected) return;

    mutate(
      {
        data: {
          userId: selected.id,
          address: selected.address,
          nickname: selected.nickname,
          artistId,
        },
      },
      {
        onSuccess(result) {
          onContinue(selected, result.code);
        },
      },
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        {m.link_cosmo_search_account()}
      </p>

      <CosmoUserCombobox
        artistId={artistId}
        value={selected}
        onChange={setSelected}
      />

      <Button
        className="mx-auto w-fit"
        onClick={handleSelect}
        disabled={!selected || isPending}
      >
        {isPending && <IconLoader2 className="size-4 animate-spin" />}
        <span>{m.link_cosmo_select_account()}</span>
      </Button>
    </div>
  );
}

type CodeStepProps = {
  user: CosmoPublicUser;
  artistId: ValidArtist;
  code: string;
  onSuccess: () => void;
  onBack: () => void;
};

function CodeStep({ user, artistId, code, onSuccess, onBack }: CodeStepProps) {
  const [copied, setCopied] = useState(false);
  const { mutate, isPending, error } = useMutation({
    mutationFn: $verifyCosmoBio,
    onError(err) {
      if (err.message === "EXPIRED" || err.message === "INVALID") {
        toast.error(m.link_cosmo_error_expired());
        onBack();
      }
    },
  });

  const isNotFound = error?.message === "NOT_FOUND";

  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleVerify() {
    mutate(
      {
        data: {
          userId: user.id,
          address: user.address,
          nickname: user.nickname,
          artistId,
          code,
        },
      },
      { onSuccess },
    );
  }

  if (isPending) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <IconLoader2 className="size-8 animate-spin" />
        <p className="text-sm text-muted-foreground">
          {m.link_cosmo_checking()}
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-muted px-4 py-2 font-mono text-2xl font-bold tracking-widest">
          {code}
        </span>
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          {copied ? (
            <IconCheck className="size-4" />
          ) : (
            <span className="text-xs">{m.common_copy()}</span>
          )}
        </Button>
      </div>

      <p className="max-w-xs text-center text-xs text-muted-foreground">
        {m.link_cosmo_bio_instructions()}
      </p>

      {isNotFound && (
        <p className="text-center text-sm text-destructive">
          {m.link_cosmo_error_not_found()}
        </p>
      )}

      <div className="flex gap-2">
        {isNotFound && (
          <Button variant="outline" onClick={onBack}>
            {m.common_back()}
          </Button>
        )}
        <Button onClick={handleVerify}>
          {isNotFound ? m.link_cosmo_check_again() : m.link_cosmo_check()}
        </Button>
      </div>
    </div>
  );
}

type SuccessStepProps = {
  nickname: string;
  profileImage: string | undefined;
  onClose: () => void;
};

function SuccessStep({ nickname, profileImage, onClose }: SuccessStepProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <IconCircleCheck className="size-12 text-green-500" />

      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={profileImage} alt={nickname} />
          <AvatarFallback className="text-xl">
            {nickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <span className="text-lg font-semibold">@{nickname}</span>
        </div>
      </div>

      <Button onClick={onClose}>{m.common_close()}</Button>

      <p className="text-xs text-muted-foreground">
        {m.link_cosmo_remove_code()}
      </p>
    </div>
  );
}
