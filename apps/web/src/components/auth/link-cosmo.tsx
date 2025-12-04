import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { FetchError, ofetch } from "ofetch";
import { createContext, useContext, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { useInterval } from "usehooks-ts";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useServerFn } from "@tanstack/react-start";
import { generateQrCode } from "@apollo/cosmo/types/qr-auth";
import { useRouter } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import { $verifyCosmo } from "./actions";
import type { AuthTicket, QueryTicket } from "@apollo/cosmo/types/qr-auth";
import type { ReactNode } from "react";
import type { z } from "zod";
import { verifyCosmoSchema } from "@/lib/universal/schema/cosmo";
import { track } from "@/lib/utils";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env/client";
import { m } from "@/i18n/messages";
import { currentAccountQuery } from "@/lib/queries/core";

type LinkCosmoContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const LinkCosmoContext = createContext<LinkCosmoContextType>({
  open: false,
  setOpen: () => {},
});

type Props = {
  children: ReactNode;
};

export default function LinkCosmo({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <LinkCosmoContext value={{ open, setOpen }}>
      <Dialog open={open} onOpenChange={setOpen}>
        {children}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.link_cosmo_title()}</DialogTitle>
            <DialogDescription>
              {m.link_cosmo_description({ appName: env.VITE_APP_NAME })}
            </DialogDescription>
          </DialogHeader>

          <StartLink />
        </DialogContent>
      </Dialog>
    </LinkCosmoContext>
  );
}

function StartLink() {
  const [started, setStarted] = useState(false);

  if (started) {
    return <GetRecaptcha />;
  }

  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      <p>{m.link_cosmo_sign_in_info({ appName: env.VITE_APP_NAME })}</p>
      <p>{m.link_cosmo_features()}</p>
      <p>{m.link_cosmo_privacy({ appName: env.VITE_APP_NAME })}</p>
      <p>{m.link_cosmo_permanent()}</p>

      <Button className="mx-auto mt-2 w-fit" onClick={() => setStarted(true)}>
        {m.common_start()}
      </Button>
    </div>
  );
}

function GetRecaptcha() {
  // get recaptcha token and exchange it for a ticket on mount
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
      {status === "pending" && <Loader2 className="h-8 w-8 animate-spin" />}

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

      {status === "success" && <RenderTicket ticket={data} retry={refetch} />}
    </div>
  );
}

type RenderQRProps = {
  ticket: AuthTicket;
  retry: () => void;
};

function RenderTicket({ ticket, retry }: RenderQRProps) {
  // query the ticket when the QR code is loaded
  const { data, status, refetch } = useQuery({
    queryKey: ["qr-auth", "ticket", ticket.ticket],
    queryFn: () =>
      ofetch<QueryTicket>("/api/cosmo/qr-auth/ticket", {
        query: {
          ticket: ticket.ticket,
        },
      }),
    refetchInterval: 2500,
    // stop polling when the user has is prompted to input their OTP
    enabled: (query) => {
      return query.state.data?.status !== "wait_for_certify";
    },
  });

  // request errored
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

  // component mount and when the QR code hasn't been scanned
  if (data === undefined || data.status === "wait_for_user_action") {
    return <RenderQRCode key={ticket.expireAt} ticket={ticket} retry={retry} />;
  }

  // ticket check failed for whatever reason
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

  // waiting for user to input their otp
  if (data.status === "wait_for_certify") {
    return <OTP ticket={ticket} />;
  }

  // login success
  return (
    <div className="flex items-center justify-center">
      <CheckCircle className="h-8 w-8" />
    </div>
  );
}

function RenderQRCode({ ticket, retry }: RenderQRProps) {
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
        <a href={qr} target="_blank">
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
};

function OTP({ ticket }: OTPProps) {
  const ctx = useContext(LinkCosmoContext);
  const mutationFn = useServerFn($verifyCosmo);
  const mutation = useMutation({
    mutationFn,
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof verifyCosmoSchema>>({
    resolver: standardSchemaResolver(verifyCosmoSchema),
    defaultValues: {
      otp: undefined,
      ticket: ticket.ticket,
    },
  });

  async function handleSubmit(data: z.infer<typeof verifyCosmoSchema>) {
    await mutation.mutateAsync(
      { data },
      {
        onSuccess: async () => {
          track("cosmo-link");
          toast.success(m.link_cosmo_success());

          await router.invalidate();
          await queryClient.invalidateQueries({
            queryKey: currentAccountQuery.queryKey,
          });

          ctx.setOpen(false);
        },
        onError() {
          toast.error(m.link_cosmo_error_linking());
        },
      },
    );
  }

  if (mutation.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <AlertTriangle className="size-12" />
        <p className="text-sm font-semibold">{m.link_cosmo_error_linking()}</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-sm">{m.link_cosmo_enter_code()}</p>

          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP
                    value={field.value.toString()}
                    onChange={(value) => field.onChange(Number(value))}
                    maxLength={2}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={mutation.isPending}>
          <span>{m.common_submit()}</span>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        </Button>
      </form>
    </Form>
  );
}

export function useLinkCosmo() {
  return useContext(LinkCosmoContext);
}
