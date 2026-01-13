import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { m } from "@/i18n/messages";
import { $scrapeCollectionMedia } from "@/lib/queries/share-data";
import { verifyCosmoSchema } from "@/lib/universal/schema/cosmo";
import type { AuthTicket, QueryTicket } from "@apollo/cosmo/types/qr-auth";
import { generateQrCode } from "@apollo/cosmo/types/qr-auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { FetchError, ofetch } from "ofetch";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { useInterval } from "usehooks-ts";
import type { z } from "zod";

type GetRecaptchaProps = {
  onSuccess: (updated: number) => void;
};

export default function GetRecaptcha({ onSuccess }: GetRecaptchaProps) {
  const { data, error, status, refetch } = useQuery({
    queryKey: ["qr-auth", "code"],
    queryFn: () =>
      ofetch<AuthTicket>("/api/cosmo/qr-auth/recaptcha", {
        retry: false,
      }),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isRateLimited = error instanceof FetchError && error.statusCode === 429;

  return (
    <div className="flex flex-col items-center justify-center">
      {status === "pending" && <IconLoader2 className="h-8 w-8 animate-spin" />}

      {status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">
            {isRateLimited
              ? m.link_cosmo_rate_limit()
              : m.link_cosmo_error_qr()}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            {m.common_try_again()}
          </Button>
        </div>
      )}

      {status === "success" && (
        <RenderTicket
          ticket={data}
          retry={() => refetch()}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

type RenderTicketProps = {
  ticket: AuthTicket;
  retry: () => void;
  onSuccess: (updated: number) => void;
};

function RenderTicket({ ticket, retry, onSuccess }: RenderTicketProps) {
  const { data, status, refetch } = useQuery({
    queryKey: ["qr-auth", "ticket", ticket.ticket],
    queryFn: () =>
      ofetch<QueryTicket>("/api/cosmo/qr-auth/ticket", {
        query: {
          ticket: ticket.ticket,
        },
      }),
    refetchInterval: 2500,
    enabled: (query) => {
      return query.state.data?.status !== "wait_for_certify";
    },
  });

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold">
          {m.link_cosmo_error_otp_status()}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          {m.common_try_again()}
        </Button>
      </div>
    );
  }

  if (data === undefined || data.status === "wait_for_user_action") {
    return <RenderQRCode key={ticket.expireAt} ticket={ticket} retry={retry} />;
  }

  if (data.status === "invalid") {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold">{m.link_cosmo_expired()}</p>
        <Button variant="cosmo" size="sm" onClick={retry}>
          {m.common_try_again()}
        </Button>
      </div>
    );
  }

  if (data.status === "wait_for_certify") {
    return <OTP ticket={ticket} onSuccess={onSuccess} />;
  }

  return (
    <div className="flex items-center justify-center">
      <IconCircleCheck className="h-8 w-8" />
    </div>
  );
}

type RenderQRCodeProps = {
  ticket: AuthTicket;
  retry: () => void;
};

function RenderQRCode({ ticket, retry }: RenderQRCodeProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const qr = generateQrCode(ticket.ticket);

  useInterval(
    () => {
      const now = new Date().getTime();
      const expireTime = new Date(ticket.expireAt).getTime();
      const difference = expireTime - now;

      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000));
      } else {
        setIsExpired(true);
      }
    },
    isExpired ? null : 1000,
  );

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <p className="text-sm">{m.link_cosmo_scan_qr()}</p>

      <Button className="inline-flex lg:hidden" variant="link" asChild>
        <a href={qr} target="_blank" rel="noreferrer">
          <span>{m.link_cosmo_mobile_open()}</span>
        </a>
      </Button>

      {isExpired ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">{m.link_cosmo_qr_expired()}</p>
          <Button variant="cosmo" size="sm" onClick={retry}>
            {m.common_try_again()}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="h-56 w-56 rounded bg-white p-4">
            <QRCode value={qr} className="h-full w-full" />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span>{m.link_cosmo_remaining()}</span>
            <span className="text-cosmo-text">
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

type OTPProps = {
  ticket: AuthTicket;
  onSuccess: (updated: number) => void;
};

function OTP({ ticket, onSuccess }: OTPProps) {
  const mutation = useMutation({
    mutationFn: $scrapeCollectionMedia,
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
      { data },
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
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col items-center justify-center gap-4">
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
