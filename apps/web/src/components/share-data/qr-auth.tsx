import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { m } from "@/i18n/messages";
import {
  $fetchQrTicket,
  $queryQrTicket,
  $scrapeCollectionMedia,
} from "@/lib/functions/share-data";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";
import { verifyCosmoSchema } from "@/lib/universal/schema/cosmo";
import type { ScrapeSelection } from "@/lib/universal/schema/share-data";
import { cn } from "@/lib/utils";
import type { AuthTicket, TicketUser } from "@apollo/cosmo/types/qr-auth";
import { generateQrCode } from "@apollo/cosmo/types/qr-auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { QRCodeSVG } from "qrcode.react";
import { type ReactNode, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useInterval, useMediaQuery } from "usehooks-ts";
import type { z } from "zod";

type GetRecaptchaProps = {
  selection: ScrapeSelection[];
  onSuccess: (updated: number) => void;
  onCancel: () => void;
};

/**
 * The ticket queries are dropped as soon as nothing observes them, so
 * cancelling or finishing starts the next attempt with a fresh ticket.
 */
export default function GetRecaptcha({
  selection,
  onSuccess,
  onCancel,
}: GetRecaptchaProps) {
  const { data, error, status, isFetching, refetch } = useQuery({
    queryKey: ["qr-auth", "code"],
    queryFn: () => $fetchQrTicket(),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const cancel = (
    <Button variant="ghost" size="sm" onClick={onCancel}>
      {m.common_cancel()}
    </Button>
  );

  if (isFetching || status === "pending") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{m.share_data_qr_loading()}</p>
          <p className="text-xs text-muted-foreground">
            {m.share_data_qr_loading_hint()}
          </p>
        </div>
        {cancel}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold">
          {isRateLimitErrorCode(error.message)
            ? m.link_cosmo_rate_limit()
            : m.link_cosmo_error_qr()}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          {m.common_try_again()}
        </Button>
        {cancel}
      </div>
    );
  }

  return (
    <RenderTicket
      key={data.ticket}
      ticket={data}
      selection={selection}
      retry={() => refetch()}
      cancel={cancel}
      onSuccess={onSuccess}
    />
  );
}

type RenderTicketProps = {
  ticket: AuthTicket;
  selection: ScrapeSelection[];
  retry: () => void;
  cancel: ReactNode;
  onSuccess: (updated: number) => void;
};

/**
 * Polls the ticket until COSMO reports the user approved it. Polling stops at
 * `expireAt`, because COSMO answers an expired ticket with an error.
 */
function RenderTicket({
  ticket,
  selection,
  retry,
  cancel,
  onSuccess,
}: RenderTicketProps) {
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(
    0,
    Math.floor((new Date(ticket.expireAt).getTime() - now) / 1000),
  );

  const { data, status, refetch } = useQuery({
    queryKey: ["qr-auth", "ticket", ticket.ticket],
    queryFn: () => $queryQrTicket({ data: { ticket: ticket.ticket } }),
    gcTime: 0,
    refetchInterval: 2500,
    enabled: (query) =>
      secondsLeft > 0 && query.state.data?.status !== "wait_for_certify",
  });

  useInterval(
    () => setNow(Date.now()),
    secondsLeft > 0 && data?.status !== "wait_for_certify" ? 1000 : null,
  );

  if (data?.status === "wait_for_certify") {
    return (
      <OTP
        ticket={ticket}
        user={data.user}
        selection={selection}
        onSuccess={onSuccess}
      />
    );
  }

  if (secondsLeft === 0 || data?.status === "invalid") {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold">
          {secondsLeft === 0
            ? m.link_cosmo_qr_expired()
            : m.link_cosmo_expired()}
        </p>
        <Button variant="cosmo" size="sm" onClick={retry}>
          {m.common_try_again()}
        </Button>
        {cancel}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold">
          {m.link_cosmo_error_otp_status()}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          {m.common_try_again()}
        </Button>
        {cancel}
      </div>
    );
  }

  if (data === undefined || data.status === "wait_for_user_action") {
    return (
      <RenderQRCode ticket={ticket} secondsLeft={secondsLeft} cancel={cancel} />
    );
  }

  return (
    <div className="flex items-center justify-center">
      <IconCircleCheck className="h-8 w-8" />
    </div>
  );
}

type RenderQRCodeProps = {
  ticket: AuthTicket;
  secondsLeft: number;
  cancel: ReactNode;
};

/**
 * On a touch device the COSMO app is usually on the same phone, so the
 * `cosmo://` link is the main action and the QR code is a fallback for
 * scanning with a second device. Elsewhere the QR code is the only action.
 */
function RenderQRCode({ ticket, secondsLeft, cancel }: RenderQRCodeProps) {
  const isTouch = useMediaQuery("(pointer: coarse)");
  const [showQr, setShowQr] = useState(false);
  const qr = generateQrCode(ticket.ticket);

  const expiry = (
    <p className="text-xs text-muted-foreground">
      <ParaglideMessage
        message={m.share_data_qr_expires}
        inputs={{
          remaining: `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}`,
        }}
        markup={{
          time: ({ children }) => <span className="font-mono">{children}</span>,
        }}
      />
    </p>
  );

  const code = (
    <div className="size-56 rounded-xl bg-white p-3">
      <QRCodeSVG value={qr} className="size-full" />
    </div>
  );

  if (!isTouch) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="max-w-64 text-sm text-muted-foreground">
          {m.share_data_qr_scan()}
        </p>
        {code}
        <div className="flex flex-col items-center gap-2">
          {expiry}
          {cancel}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 text-center">
      <a
        href={qr}
        className={cn(
          buttonVariants({ variant: "cosmo", size: "lg" }),
          "w-full",
        )}
      >
        <img
          src="/cosmo.webp"
          alt=""
          className="aspect-square size-5 rounded-full"
        />
        <span>{m.share_data_qr_open_app()}</span>
      </a>
      <p className="text-sm text-muted-foreground">
        {m.share_data_qr_open_hint()}
      </p>
      {expiry}

      {showQr ? (
        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {m.share_data_qr_scan_other()}
          </p>
          {code}
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setShowQr(true)}>
          {m.share_data_qr_show()}
        </Button>
      )}

      {cancel}
    </div>
  );
}

type OTPProps = {
  ticket: AuthTicket;
  user: TicketUser;
  selection: ScrapeSelection[];
  onSuccess: (updated: number) => void;
};

function OTP({ ticket, user, selection, onSuccess }: OTPProps) {
  const mutation = useMutation({
    mutationFn: $scrapeCollectionMedia,
  });

  // pick a random profile image once, since COSMO returns one per artist
  const [avatar] = useState(() => {
    const images = user.profileImages;
    if (images.length === 0) return undefined;
    return images[Math.floor(Math.random() * images.length)];
  });

  const form = useForm<z.infer<typeof verifyCosmoSchema>>({
    resolver: standardSchemaResolver(verifyCosmoSchema),
    defaultValues: {
      otp: undefined,
      ticket: ticket.ticket,
    },
  });

  async function handleSubmit(data: z.infer<typeof verifyCosmoSchema>) {
    const result = await mutation.mutateAsync(
      { data: { ...data, selection } },
      {
        onError() {
          toast.error(m.link_cosmo_error_linking());
        },
      },
    );

    onSuccess(result.updated);
  }

  if (mutation.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <IconAlertTriangle className="size-12" />
        <p className="text-sm font-semibold">{m.link_cosmo_error_linking()}</p>
      </div>
    );
  }

  if (mutation.isPending) {
    return (
      <div className="flex flex-col items-center gap-2">
        <IconLoader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">
          {m.share_data_uploading()}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col items-center gap-4"
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="size-12">
            <AvatarImage src={avatar?.profileImageUrl} alt={user.nickname} />
            <AvatarFallback>
              {user.nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-semibold">
            {m.link_cosmo_signing_in_as({ nickname: user.nickname })}
          </p>
        </div>

        <p className="text-center text-sm">{m.link_cosmo_enter_code()}</p>

        <Controller
          control={form.control}
          name="otp"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <InputOTP
                value={field.value?.toString() ?? ""}
                onChange={(value) => field.onChange(Number(value))}
                maxLength={2}
                pattern={REGEXP_ONLY_DIGITS}
                autoFocus
                aria-invalid={fieldState.invalid}
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                </InputOTPGroup>
              </InputOTP>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        <span>{m.common_submit()}</span>
        {mutation.isPending && <IconLoader2 className="h-4 w-4 animate-spin" />}
      </Button>
    </form>
  );
}
