"use client";

import { Button } from "@/components/ui/button";
import {
  generateQrCode,
  type AuthTicket,
  type QueryTicket,
} from "@/lib/universal/cosmo/qr-auth";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { FetchError, ofetch } from "ofetch";
import { createContext, useContext, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "@/components/ui/use-toast";
import { useInterval } from "usehooks-ts";
import { useAction } from "next-safe-action/hooks";
import { verifyCosmo } from "./actions";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { env } from "@/env";
import Link from "next/link";
import { track } from "@/lib/utils";

export const LinkCosmoContext = createContext({
  open: false,
  setOpen: (open: boolean) => {},
});

type Props = {
  children: React.ReactNode;
};

export default function LinkCosmo({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <LinkCosmoContext value={{ open, setOpen }}>
      <Dialog open={open} onOpenChange={setOpen}>
        {children}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link COSMO</DialogTitle>
            <DialogDescription>
              Link your COSMO account to your {env.NEXT_PUBLIC_APP_NAME}{" "}
              account.
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
      <p>
        Signing into your COSMO account will link it to your{" "}
        {env.NEXT_PUBLIC_APP_NAME} account, verifying ownership of the COSMO ID
        and wallet address.
      </p>
      <p>
        This allows you to pin and lock objekts. Any previously created objekt
        lists will be imported upon account link.
      </p>
      <p>
        {env.NEXT_PUBLIC_APP_NAME} does not store anything about your account
        other than the ID and wallet address, which are used to display
        profiles.
      </p>
      <p>Once linked, the account cannot be unlinked.</p>

      <Button className="mt-2 w-fit mx-auto" onClick={() => setStarted(true)}>
        Start
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
    <div className="flex flex-col justify-center items-center">
      {status === "pending" && <Loader2 className="h-8 w-8 animate-spin" />}

      {status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">
            {isRateLimited
              ? "There may be too many attempts at once. Please try again later."
              : "Error getting QR code. Please try again later."}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
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
    queryKey: ["qr-auth", "ticket"],
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
        <p className="text-sm font-semibold">Error checking OTP status</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
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
        <p className="text-sm font-semibold">The login attempt has expired.</p>
        <Button variant="cosmo" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  // waiting for user to input their otp
  if (data.status === "wait_for_certify") {
    return <OTP ticket={ticket} />;
  }

  // login success
  if (data.status === "certified") {
    return (
      <div className="flex items-center justify-center">
        <CheckCircle className="h-8 w-8" />
      </div>
    );
  }
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
    isExpired ? null : 1000
  );

  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      <p className="text-sm">
        Scan the QR code with your mobile device to sign in.
      </p>

      <Button className="inline-flex lg:hidden" variant="link" asChild>
        <Link href={qr} target="_blank">
          <span>Mobile: Open COSMO</span>
        </Link>
      </Button>

      {isExpired ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">The QR code has expired.</p>
          <Button variant="cosmo" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 bg-white h-56 w-56 rounded">
            <QRCode value={qr} className="w-full h-full" />
          </div>

          <div className="text-sm flex gap-2 items-center">
            <span>Remaining</span>
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
  const { execute, isPending, hasErrored } = useAction(verifyCosmo, {
    onSuccess() {
      track("cosmo-link");
      toast({
        description: "COSMO account linked!",
      });
      ctx.setOpen(false);
    },
    onError() {
      toast({
        description: "Error linking COSMO account",
        variant: "destructive",
      });
    },
  });

  if (hasErrored) {
    return (
      <div className="flex flex-col gap-2 items-center justify-center">
        <AlertTriangle className="size-12" />
        <p className="text-sm font-semibold">Error linking COSMO account</p>
      </div>
    );
  }

  return (
    <form action={execute} className="flex flex-col gap-4">
      <input type="hidden" name="ticket" value={ticket.ticket} />

      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-center">Enter the 2-digit code from COSMO</p>

        <InputOTP
          name="otp"
          maxLength={2}
          pattern={REGEXP_ONLY_DIGITS}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button type="submit" disabled={isPending}>
        <span>Submit</span>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      </Button>
    </form>
  );
}
