import MetadataSheet from "@/components/objekt/metadata-sheet";
import {
  MetadataDialogContext,
  type MetadataDialogTarget,
} from "@/hooks/use-metadata-dialog";
import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type DialogState = {
  slug: string;
  target?: MetadataDialogTarget;
};

type Props = {
  children: ReactNode;
};

/**
 * Mounts a single Sheet for objekt metadata at the page level. Consumers call
 * `useMetadataDialog().open(slug)` to display it instead of wrapping each
 * grid item in its own dialog instance.
 */
export function MetadataDialogProvider({ children }: Props) {
  const [state, setState] = useState<DialogState | null>(null);
  const { setSerial, reset } = useObjektSerial();
  // the sheet has no trigger for Radix to refocus, so remember what opened it
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback(
    (slug: string, target?: MetadataDialogTarget) => {
      opener.current =
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
          ? document.activeElement
          : null;
      if (target?.type === "serial") {
        setSerial(target.serial);
      }
      setState({ slug, target });
    },
    [setSerial],
  );

  const close = useCallback(() => {
    setState(null);
    reset();
  }, [reset]);

  // only stable callbacks, so opening the sheet doesn't re-render every consumer
  const value = useMemo(
    () => ({ open, close, preload: MetadataSheet.preload }),
    [open, close],
  );

  return (
    <MetadataDialogContext.Provider value={value}>
      {children}

      <MetadataSheet
        slug={state?.slug}
        target={state?.target}
        open={state !== null}
        onOpenChange={(next) => {
          if (next === false) {
            close();
          }
        }}
        finalFocus={() =>
          opener.current?.isConnected === true ? opener.current : true
        }
      />
    </MetadataDialogContext.Provider>
  );
}
