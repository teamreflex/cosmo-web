import { Button } from "@/components/ui/button";
import {
  generateQrCode,
  AuthTicket,
  QueryTicket,
} from "@/lib/universal/cosmo/qr-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle, Loader2 } from "lucide-react";
import { ofetch } from "ofetch";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function SignInWithQR() {
  // get recaptcha token and exchange it for a ticket on mount
  const { data, status, refetch } = useQuery({
    queryKey: ["qr-auth", "code"],
    queryFn: () => ofetch<AuthTicket>("/api/auth/qr/recaptcha"),
    staleTime: Infinity,
  });

  return (
    <div className="flex flex-col justify-center items-center">
      {status === "pending" && <Loader2 className="h-8 w-8 animate-spin" />}

      {status === "error" && (
        <div className="flex flex-col">
          <p className="text-sm font-semibold">Error loading QR code</p>
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
  const { data, status } = useQuery({
    queryKey: ["qr-auth", "ticket"],
    queryFn: () =>
      ofetch<QueryTicket>("/api/auth/qr/ticket", {
        query: {
          ticket: ticket.ticket,
        },
      }),
    refetchInterval: 2500,
  });

  // request errored
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold">Error loading QR code</p>
        <Button variant="secondary" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  // component mount and when the QR code hasn't been scanned
  if (data === undefined || data.status === "wait_for_user_action") {
    return <RenderQRCode ticket={ticket} retry={retry} />;
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
}

function RenderQRCode({ ticket, retry }: RenderQRProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const qr = generateQrCode(ticket.ticket);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expireTime = new Date(ticket.expireAt).getTime();
      const difference = expireTime - now;

      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000));
      } else {
        setIsExpired(true);
        clearInterval(interval);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [ticket.expireAt]);

  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      <p className="text-sm font-semibold">
        Scan the QR code with your mobile device to log in.
      </p>

      {isExpired ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">The QR code has expired.</p>
          <Button variant="cosmo" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 bg-white h-40 w-40 rounded">
            <QRCode value={qr} />
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
  const router = useRouter();
  const { toast } = useToast();
  const { mutate, status } = useMutation({
    mutationFn: (otp: number) =>
      ofetch(
        new URL(
          COSMO_ENDPOINT,
          "/bff/v1/users/auth/login/native/qr/ticket/certify"
        ).toString(),
        {
          method: "POST",
          body: {
            otp,
            ticket: ticket.ticket,
          },
          query: {
            tid: crypto.randomUUID(),
          },
        }
      ),
  });

  function submit(form: FormData) {
    const otp = form.get("otp")?.toString();
    if (otp === undefined) {
      return;
    }

    mutate(parseInt(otp), {
      onSuccess: () => {
        toast({
          description: "Successfully signed in!",
        });
        router.refresh();
      },
      onError: () => {
        toast({
          description: "Error signing in",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <form action={submit}>
      <input type="text" name="otp" />
      <button type="submit" disabled={status === "pending"}>
        Submit
      </button>
    </form>
  );
}
