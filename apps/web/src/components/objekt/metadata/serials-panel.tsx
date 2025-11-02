import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { ofetch } from "ofetch";
import { ChevronDown, ChevronUp, HeartCrack } from "lucide-react";
import { IconRotate360 } from "@tabler/icons-react";
import { useDebounceValue } from "usehooks-ts";
import { Link } from "@tanstack/react-router";
import { MetadataDialogError } from "./common";
import type { SerialObjekt, SerialTransfer } from "@/lib/universal/objekts";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Addresses, isEqual } from "@/lib/utils";
import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { m } from "@/i18n/messages";

type Props = {
  slug: string;
};

export default function SerialsPanel(props: Props) {
  const { serial, setSerial } = useObjektSerial();
  const [debounced] = useDebounceValue(serial, 300);

  function handleNext() {
    setSerial((prev) => (prev ?? 0) + 1);
  }

  function handlePrevious() {
    if (serial === 1 || serial === undefined) {
      return;
    }

    setSerial((prev) => (prev ?? 0) - 1);
  }

  function handleChange(value: string) {
    const parsed = parseInt(value);
    if (isNaN(parsed)) {
      return;
    }

    setSerial(parsed);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-row gap-2">
        <Input
          type="number"
          placeholder={m.objekt_serials_placeholder()}
          value={serial ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1"
        />

        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronUp />
        </Button>
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronDown />
        </Button>
      </div>

      {debounced !== undefined && debounced > 0 && (
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              FallbackComponent={MetadataDialogError}
              onReset={reset}
            >
              <Suspense fallback={<Fallback />}>
                <Content serial={debounced} slug={props.slug} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      )}
    </div>
  );
}

function Fallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

type ContentProps = {
  serial: number;
  slug: string;
};

function Content(props: ContentProps) {
  const {
    data: { result },
  } = useSuspenseQuery({
    queryKey: ["objekt-serial", props.slug, props.serial],
    queryFn: async () => {
      return await ofetch<{ result: SerialObjekt | null }>(
        `/api/objekts/metadata/${props.slug}/${props.serial}`,
      );
    },
    retry: 1,
  });

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <HeartCrack className="size-8" />
        <span className="text-sm font-medium">
          {m.objekt_serials_not_exist({
            serial: props.serial.toString().padStart(5, "0"),
          })}
        </span>
      </div>
    );
  }

  const href = result.username ? `/@${result.username}` : `/@${result.address}`;

  return (
    <div className="flex w-full flex-col gap-2">
      {/* owner */}
      <Link
        to={href}
        className="group flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary/60"
      >
        <img
          src="/profile.webp"
          alt={m.objekt_serials_profile_alt()}
          className="size-10 rounded-full bg-cosmo-profile p-1"
        />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {m.objekt_serials_owner()}
          </span>
          <span className="font-medium group-hover:underline">
            {result.username ?? result.address.substring(0, 8) + "..."}
          </span>
        </div>
      </Link>

      {/* Transfers section */}
      {result.transfers.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[2fr_2fr_2fr] gap-2 border-b bg-secondary/30 px-4 py-2 text-xs font-medium">
            <span>{m.transfer_from()}</span>
            <span>{m.transfer_to()}</span>
            <span className="text-right">{m.transfer_date_header()}</span>
          </div>
          <div className="md:max-h-36 md:overflow-y-auto">
            {result.transfers.map((transfer) => (
              <TransferItem key={transfer.id} transfer={transfer} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type TransferItemProps = {
  transfer: SerialTransfer;
};

function TransferItem({ transfer }: TransferItemProps) {
  const timestamp = new Date(transfer.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return (
    <div className="grid h-10 grid-cols-[2fr_2fr_2fr] items-center gap-2 border-b px-4 text-xs transition-colors last:border-b-0 hover:bg-secondary/20">
      <div className="flex items-center gap-2">
        {/* from cosmo */}
        {isEqual(transfer.from, Addresses.NULL) && (
          <img
            src="/cosmo.webp"
            alt={m.common_cosmo()}
            className="aspect-square size-5 shrink-0 rounded-full ring ring-accent"
          />
        )}

        {/* from user */}
        {isEqual(transfer.from, Addresses.SPIN) ? (
          <div className="flex items-center gap-1">
            <IconRotate360 className="size-4" />
            <span className="truncate">{m.transfer_cosmo_spin()}</span>
          </div>
        ) : !isEqual(transfer.from, Addresses.NULL) ? (
          <Link
            to="/@{$username}"
            params={{ username: transfer.fromUsername ?? transfer.from }}
            className="truncate hover:underline"
          >
            {formatAddress(transfer.from, transfer.fromUsername)}
          </Link>
        ) : (
          <span className="truncate">
            {formatAddress(transfer.from, transfer.fromUsername)}
          </span>
        )}
      </div>

      {/* to user */}
      <div className="truncate">
        {isEqual(transfer.to, Addresses.SPIN) ? (
          <div className="flex items-center gap-1">
            <IconRotate360 className="size-4" />
            <span className="truncate">{m.transfer_cosmo_spin()}</span>
          </div>
        ) : !isEqual(transfer.to, Addresses.NULL) ? (
          <Link
            to="/@{$username}"
            params={{ username: transfer.toUsername ?? transfer.to }}
            className="hover:underline"
          >
            {formatAddress(transfer.to, transfer.toUsername)}
          </Link>
        ) : (
          <span>{formatAddress(transfer.to, transfer.toUsername)}</span>
        )}
      </div>

      {/* timestamp */}
      <span className="text-right break-words text-muted-foreground">
        {timestamp}
      </span>
    </div>
  );
}

function formatAddress(address: string, username: string | null) {
  if (isEqual(address, Addresses.NULL)) {
    return m.common_cosmo();
  }

  if (isEqual(address, Addresses.SPIN)) {
    return m.transfer_cosmo_spin();
  }

  if (username) {
    return username;
  }

  return address.substring(0, 8) + "...";
}
