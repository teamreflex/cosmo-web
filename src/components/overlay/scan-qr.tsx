"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "../ui/button";
import {
  CheckCircle,
  Loader2,
  QrCode,
  Scan,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import VisuallyHidden from "../ui/visually-hidden";
import { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { cn, track } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { ScannedObjekt } from "@/lib/universal/cosmo/objekts";
import { toast } from "../ui/use-toast";
import { useCamera } from "@/hooks/use-camera";
import { useUserState } from "@/hooks/use-user-state";
import { extractObjektCode } from "@/lib/universal/cosmo/albums";
import { ErrorBoundary } from "react-error-boundary";
import { lazy, Suspense } from "react";
import Skeleton from "../skeleton/skeleton";
import { ObjektSidebar } from "../objekt/common";
import FlippableObjekt from "../objekt/objekt-flippable";
import { Objekt } from "../../lib/universal/objekt-conversion";

const Scanner = lazy(() =>
  import("@yudiel/react-qr-scanner").then((mod) => ({ default: mod.Scanner }))
);

type State = "scan" | "claim" | "success";
type ScanResult = {
  serial: string;
  objekt: ScannedObjekt;
};

export default function ScanQR() {
  const { token } = useUserState();
  const [open, setOpen] = useState(false);
  const { isSupported } = useCamera();

  if (!token || !isSupported) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      shouldScaleBackground={false}
      preventScrollRestoration={true}
    >
      <DrawerTrigger className="flex items-center justify-center p-2 rounded-full bg-cosmo size-16 aspect-square drop-shadow-sm ring-0">
        <QrCode className="text-white size-10" />
      </DrawerTrigger>

      <ScanObjekt open={open} onClose={() => setOpen(false)} />
    </Drawer>
  );
}

type ScanObjektProps = {
  open: boolean;
  onClose: () => void;
};

function ScanObjekt(props: ScanObjektProps) {
  const [state, setState] = useState<State>("scan");
  const [result, setResult] = useState<ScanResult>();
  const queryClient = useQueryClient();

  function onScanResult(result: ScanResult) {
    setResult(result);
    setState("claim");
  }

  function onClaim() {
    setResult(undefined);
    setState("success");
    track("scan-objekt");
    queryClient.invalidateQueries({
      queryKey: ["collection"],
    });
  }

  function onReset() {
    setResult(undefined);
    setState("scan");
  }

  function onClose() {
    setResult(undefined);
    setState("scan");
    props.onClose();
  }

  switch (state) {
    case "scan":
      return (
        <QRScanner
          open={props.open}
          onResult={onScanResult}
          onClose={onClose}
        />
      );
    case "claim":
      if (result) {
        return (
          <ClaimObjekt
            serial={result.serial}
            result={result.objekt}
            onClaim={onClaim}
            onClose={onClose}
          />
        );
      }
      return <div>todo</div>;
    case "success":
      return <ClaimSuccess reset={onReset} onClose={onClose} />;
  }
}

type QRScannerProps = {
  open: boolean;
  onResult: (result: ScanResult) => void;
  onClose: () => void;
};

function QRScanner({ open, onResult, onClose }: QRScannerProps) {
  const { hasPermission, request, isLoading } = useCamera({
    enabled: open,
  });
  const { token } = useUserState();
  const { mutate, status } = useMutation({
    mutationFn: async (serial: string) => {
      return await ofetch<ScannedObjekt>(
        `${COSMO_ENDPOINT}/objekt/v1/by-serial/${serial}`,
        {
          headers: {
            Authorization: `Bearer ${token!.accessToken}`,
          },
        }
      );
    },
    onSuccess: (result, serial) => {
      onResult({
        serial: serial,
        objekt: result,
      });
    },
  });

  function onScan(result: IDetectedBarcode[]) {
    try {
      const value = result[0].rawValue;
      const matched = extractObjektCode(value);

      if (matched.type === "oma") {
        toast({
          description: "OMAs are not supported yet",
        });
        return;
      }

      mutate(matched.value);
    } catch (error) {
      toast({
        description: "QR code not recognized",
        variant: "destructive",
      });
    }
  }

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Scan Objekt</DrawerTitle>
        <VisuallyHidden>
          <DrawerDescription>Scan an objekt QR code.</DrawerDescription>
        </VisuallyHidden>
      </DrawerHeader>

      {/* qr has been submitted */}
      {status === "pending" && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="size-24 animate-spin" />
        </div>
      )}

      {/* camera isn't ready and has no permission */}
      {hasPermission === false && (
        <div className="flex items-center justify-center py-2">
          <Button variant="secondary" onClick={() => request()}>
            <span>Enable Camera</span>
            {isLoading ? (
              <Loader2 className="size-4 ml-2 animate-spin" />
            ) : (
              <Scan className="ml-2 size-4" />
            )}
          </Button>
        </div>
      )}

      {/* camera is ready and has permission */}
      {hasPermission && (
        <ErrorBoundary FallbackComponent={ScannerError}>
          <div
            className={cn(
              "mx-auto size-60 aspect-square rounded-lg text-clip border-2 border-accent",
              status === "error" && "border-red-500",
              status === "success" && "border-green-500"
            )}
          >
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <Scanner
                onScan={onScan}
                paused={status !== "idle"}
                formats={["qr_code"]}
                allowMultiple={false}
                components={{
                  audio: false,
                  finder: false,
                }}
                styles={{
                  video: {
                    height: "100%",
                    width: "100%",
                  },
                  finderBorder: 0,
                }}
              />
            </Suspense>
          </div>
        </ErrorBoundary>
      )}

      <DrawerFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );
}

function ScannerError({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex items-center justify-center mx-auto py-2">
      <TriangleAlert className="size-12 text-red-500" />
      <p className="text-sm font-semibold">Error with QR scanner</p>
      <Button variant="secondary" size="sm" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
}

type ClaimObjektProps = {
  serial: string;
  result: ScannedObjekt;
  onClaim: () => void;
  onClose: () => void;
};

function ClaimObjekt({ serial, result, onClaim, onClose }: ClaimObjektProps) {
  const { token } = useUserState();
  const { mutate, status } = useMutation({
    mutationFn: async () => {
      return await ofetch(
        `${COSMO_ENDPOINT}/objekt/v1/by-serial/${serial}/claim`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token!.accessToken}`,
          },
        }
      );
    },
    onSuccess: () => {
      onClaim();
    },
    onError: (error) => {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to claim objekt",
      });
    },
  });

  const objekt = Objekt.fromScanned(result);
  const isClaimed = result.isClaimed;

  const title = `${objekt.collectionId} #${serial.padStart(5, "0")}`;
  const description = `Objekt is ${
    isClaimed ? " already claimed" : "claimable"
  }`;

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{title}</DrawerTitle>
        <DrawerDescription>{description}</DrawerDescription>
      </DrawerHeader>

      <div className="relative mx-auto h-72 aspect-photocard">
        <FlippableObjekt objekt={objekt}>
          <ObjektSidebar
            collection={objekt.collectionNo}
            serial={Number(serial)}
          />
        </FlippableObjekt>
      </div>

      <DrawerFooter className="flex-row justify-center items-center gap-2">
        <Button
          disabled={status === "pending"}
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        {isClaimed === false && (
          <Button disabled={status === "pending"} onClick={() => mutate()}>
            <span>Claim</span>
            {status === "pending" && (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            )}
          </Button>
        )}
      </DrawerFooter>
    </DrawerContent>
  );
}

type ClaimSuccessProps = {
  reset: () => void;
  onClose: () => void;
};

function ClaimSuccess({ reset, onClose }: ClaimSuccessProps) {
  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Objekt Claimed!</DrawerTitle>
        <VisuallyHidden>
          <DrawerDescription>Objekt Claimed!</DrawerDescription>
        </VisuallyHidden>
      </DrawerHeader>

      <CheckCircle className="size-24 mx-auto" />

      <DrawerFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button onClick={reset}>Scan Another</Button>
      </DrawerFooter>
    </DrawerContent>
  );
}
