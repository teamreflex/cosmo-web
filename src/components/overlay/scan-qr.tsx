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
import { AlertTriangle, CheckCircle, Loader2, QrCode } from "lucide-react";
import { PropsWithChildren, useMemo, useState } from "react";
import VisuallyHidden from "../ui/visually-hidden";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { cn, track } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { ScannedObjekt } from "@/lib/universal/cosmo/objekts";
import { toast } from "../ui/use-toast";
import { FlippableObjekt } from "../objekt/objekt";
import ObjektSidebar from "../objekt/objekt-sidebar";
import { useCamera } from "@/hooks/use-camera";
import { useUserState } from "@/hooks/use-user-state";
import {
  CosmoAlbumWithTracks,
  extractObjektCode,
} from "@/lib/universal/cosmo/albums";
import Image from "next/image";
import { useAlbumStore, useTrackDownload } from "@/hooks/use-oma";

type State = "scan" | "claim" | "objekt-success" | "oma-register";

type ResultObjekt = {
  type: "objekt";
  serial: string;
  objekt: ScannedObjekt;
};

type ResultOMA = {
  type: "oma";
  code: string;
  album: CosmoAlbumWithTracks;
};

type ScanResult = ResultObjekt | ResultOMA;
type ResultType = ScanResult["type"];

export default function ScanQR() {
  const { token } = useUserState();
  const [open, setOpen] = useState(false);
  const { isAvailable, isLoading } = useCamera();

  if (!token || isLoading || (isLoading === false && isAvailable === false)) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      shouldScaleBackground={false}
      preventScrollRestoration={true}
    >
      <DrawerTrigger className="flex items-center justify-center p-2 rounded-full bg-cosmo size-16 aspect-square drop-shadow ring-0 pointer-events-auto">
        <QrCode className="text-white size-10" />
      </DrawerTrigger>

      <ScanState onClose={() => setOpen(false)} />
    </Drawer>
  );
}

type ScanObjektProps = {
  onClose: () => void;
};

function ScanState(props: ScanObjektProps) {
  const [state, setState] = useState<State>("scan");
  const [result, setResult] = useState<ScanResult>();
  const queryClient = useQueryClient();

  function onReset() {
    setResult(undefined);
    setState("scan");
  }

  function onClose() {
    setResult(undefined);
    setState("scan");
    props.onClose();
  }

  function onScanResult(result: ScanResult) {
    setResult(result);
    setState("claim");
  }

  function onClaim(type: ResultType) {
    switch (type) {
      case "objekt":
        setState("objekt-success");
        track("scan-objekt");
        queryClient.invalidateQueries({
          queryKey: ["collection"],
        });
        break;
      case "oma":
        setState("oma-register");
        queryClient.invalidateQueries({
          queryKey: ["oma-storage"],
        });
        break;
    }
  }

  function onRegister() {
    setResult(undefined);
    setState("scan");
    queryClient.invalidateQueries({
      queryKey: ["oma-storage"],
    });
    props.onClose();
  }

  switch (state) {
    case "scan":
      return <QRScanner onResult={onScanResult} onClose={onClose} />;
    case "claim":
      if (!result) return null;

      if (result.type === "objekt") {
        return (
          <ClaimObjekt
            serial={result.serial}
            result={result.objekt}
            onClaim={onClaim}
            onClose={onClose}
          />
        );
      }

      if (result.type === "oma") {
        return (
          <ClaimOMA
            code={result.code}
            result={result.album}
            onClaim={onClaim}
            onClose={onClose}
          />
        );
      }
    case "oma-register":
      if (result && result.type === "oma") {
        return <OMARegister result={result.album} onRegister={onRegister} />;
      }
      return null;
    case "objekt-success":
      return <ObjektSuccess reset={onReset} onClose={onClose} />;
  }
}

type QRScannerProps = {
  onResult: (result: ScanResult) => void;
  onClose: () => void;
};

function QRScanner({ onResult, onClose }: QRScannerProps) {
  const { token } = useUserState();
  const objekt = useMutation({
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
        type: "objekt",
        serial: serial,
        objekt: result,
      });
    },
  });
  const oma = useMutation({
    mutationFn: async (code: string) => {
      return await ofetch<CosmoAlbumWithTracks>(
        `/api/bff/v3/objekt-music-album-qr-codes/album`,
        {
          query: {
            n: code,
          },
          headers: {
            Authorization: `Bearer ${token!.accessToken}`,
          },
        }
      );
    },
    onSuccess: (result, code) => {
      onResult({
        type: "oma",
        code: code,
        album: result,
      });
    },
  });

  const isPending = objekt.status === "pending" || oma.status === "pending";
  const isSuccess = objekt.status === "success" || oma.status === "success";
  const isError = objekt.status === "error" || oma.status === "error";
  const isIdle = objekt.status === "idle" || oma.status === "idle";

  function onScan(result: IDetectedBarcode[]) {
    try {
      const value = result[0].rawValue;
      const matched = extractObjektCode(value);

      switch (matched.type) {
        case "objekt":
          objekt.mutate(matched.value);
          break;
        case "oma":
          oma.mutate(matched.value);
          break;
      }
    } catch (error) {
      //
    }
  }

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Scan QR Code</DrawerTitle>
        <VisuallyHidden>
          <DrawerDescription>Scan an objekt or OMA QR code.</DrawerDescription>
        </VisuallyHidden>
      </DrawerHeader>

      {isPending ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="size-24 animate-spin" />
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto size-60 aspect-square rounded-lg overflow-clip border-2",
            isIdle && "border-accent",
            isError && "border-red-500",
            isSuccess && "border-green-500"
          )}
        >
          <Scanner
            onScan={onScan}
            paused={isIdle === false}
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
        </div>
      )}

      <DrawerFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );
}

type ClaimObjektProps = {
  serial: string;
  result: ScannedObjekt;
  onClaim: (type: ResultType) => void;
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
      onClaim("objekt");
    },
    onError: (error) => {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to claim objekt",
      });
    },
  });

  const { objekt, isClaimed } = result;

  const title = `${objekt.collectionId} #${objekt.objektNo
    .toString()
    .padStart(5, "0")}`;

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{title}</DrawerTitle>
        <DrawerDescription>
          Objekt is {isClaimed ? " already claimed" : "claimable"}
        </DrawerDescription>
      </DrawerHeader>

      <div className="relative mx-auto h-72 aspect-photocard">
        <FlippableObjekt id={title} objekt={objekt} serial={objekt.objektNo}>
          <ObjektSidebar
            collection={objekt.collectionNo}
            serial={objekt.objektNo}
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

type ClaimOMAProps = {
  code: string;
  result: CosmoAlbumWithTracks;
  onClaim: (type: ResultType) => void;
  onClose: () => void;
};

function ClaimOMA({ code, result, onClaim, onClose }: ClaimOMAProps) {
  const { token } = useUserState();
  const albumStore = useAlbumStore(result);
  const { mutate, status } = useMutation({
    mutationFn: async () => {
      return await ofetch(`/api/bff/v3/objekt-music-album-qr-codes/claim`, {
        method: "POST",
        query: {
          n: code,
        },
        headers: {
          Authorization: `Bearer ${token!.accessToken}`,
        },
      });
    },
    onSuccess: async () => {
      await albumStore.mutateAsync();
      onClaim("oma");
    },
    onError: (error) => {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to claim OMA",
      });
    },
  });

  return (
    <DrawerContent className="overflow-hidden" handle={false}>
      <VisuallyHidden>
        <DrawerHeader>
          <DrawerTitle>{result.title}</DrawerTitle>
          <DrawerDescription>
            {result.artist.title} - {result.title}
          </DrawerDescription>
        </DrawerHeader>
      </VisuallyHidden>

      <OMAHeader album={result}>
        <div className="flex flex-col items-center justify-center mt-4 text-center px-2">
          <p>Register this OMA? It will be permanently tied to your account.</p>
          <p>You will need the QR code again when switching devices.</p>
        </div>
      </OMAHeader>

      <DrawerFooter className="flex-row justify-center items-center gap-2">
        <Button
          disabled={status === "pending"}
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>

        <Button disabled={status === "pending"} onClick={() => mutate()}>
          <span>Register</span>
          {status === "pending" && (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          )}
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );
}

type OMARegisterProps = {
  result: CosmoAlbumWithTracks;
  onRegister: () => void;
};

function OMARegister({ result, onRegister }: OMARegisterProps) {
  const { status } = useTrackDownload(result.hid);

  return (
    <DrawerContent handle={false}>
      <VisuallyHidden>
        <DrawerHeader>
          <DrawerTitle>{result.title}</DrawerTitle>
          <DrawerDescription>
            {result.artist.title} - {result.title}
          </DrawerDescription>
        </DrawerHeader>
      </VisuallyHidden>

      <OMAHeader album={result}>
        <div className="flex flex-col items-center justify-center mt-4">
          {(() => {
            switch (status) {
              case "pending":
                return (
                  <>
                    <Loader2 className="size-10 animate-spin" />
                    <p className="text-sm font-semibold">Registering OMA...</p>
                  </>
                );
              case "error":
                return (
                  <>
                    <AlertTriangle className="size-10" />
                    <p className="text-sm font-semibold">
                      Error downloading album
                    </p>
                  </>
                );
              case "success":
                return (
                  <>
                    <CheckCircle className="size-10" />
                    <p className="text-sm font-semibold">
                      OMA registered & downloaded!
                    </p>
                  </>
                );
            }
          })()}
        </div>
      </OMAHeader>

      {status !== "pending" && (
        <DrawerFooter>
          <Button variant="secondary" onClick={onRegister}>
            Close
          </Button>
        </DrawerFooter>
      )}
    </DrawerContent>
  );
}

type ObjektSuccessProps = {
  reset: () => void;
  onClose: () => void;
};

function ObjektSuccess({ reset, onClose }: ObjektSuccessProps) {
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

type OMAHeaderProps = PropsWithChildren<{
  album: CosmoAlbumWithTracks;
}>;

function OMAHeader({ children, album }: OMAHeaderProps) {
  return (
    <div className="flex flex-col">
      <div className="relative w-full aspect-[16/12]">
        <Image
          src={album.albumImageThumbnailUrl}
          fill={true}
          alt={album.title}
          className="object-cover blur-lg"
        />

        <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center flex-col">
          <div className="relative aspect-square shrink-0 w-1/2 bg-accent rounded-lg overflow-hidden border border-black">
            <Image
              src={album.albumImageThumbnailUrl}
              fill={true}
              alt={album.title}
            />
          </div>
          <p className="text-lg font-semibold drop-shadow">
            {album.artist.title}
          </p>
          <p className="font-semibold drop-shadow">{album.title}</p>
        </div>
      </div>

      {children}
    </div>
  );
}
