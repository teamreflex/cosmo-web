import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { IconMaximize } from "@tabler/icons-react";
import { format } from "date-fns";
import { Suspense, use, useState } from "react";
import { browser } from "react-dom";
import {
  CornerOverlay,
  OverlayIcon,
  OverlayIconButton,
} from "./corner-overlay";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function InformationOverlay(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <CornerOverlay
      corner="bottom-left"
      variant="panel"
      data-open={open}
      className="isolate flex h-5 w-5 gap-2 data-[open=true]:h-32 data-[open=true]:w-20 sm:h-9 sm:w-9 sm:data-[open=true]:h-32 sm:data-[open=true]:w-32"
    >
      {/* hit area matches the container padding so the whole collapsed chip is clickable */}
      <OverlayIconButton
        className="z-50 place-self-end sm:-m-2 sm:p-2"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={m.aria_expand_info()}
      >
        <OverlayIcon icon={IconMaximize} />
      </OverlayIconButton>

      {/* pointer-events gate: the faded-out panel must not swallow clicks while closed or mid-transition */}
      <div className="absolute z-40 flex flex-col gap-1 transition-all group-data-[open=false]:pointer-events-none group-data-[open=false]:opacity-0 group-data-[open=true]:opacity-100">
        <div className="flex flex-col text-xs">
          <span className="font-semibold">{m.objekt_info_token_id()}</span>
          <span>{props.token.tokenId}</span>
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold">{m.common_received()}</span>
          <span>
            <Suspense fallback={null}>
              <ReceivedAt acquiredAt={props.token.acquiredAt} />
            </Suspense>
          </span>
        </div>
      </div>
    </CornerOverlay>
  );
}

/**
 * When the token was received, in the viewer's timezone, which the server
 * doesn't know.
 */
function ReceivedAt(props: { acquiredAt: string }) {
  use(browser("The received date is formatted in the viewer's timezone."));

  // safari 15 doesn't like to parse the date string for some reason
  try {
    return format(new Date(props.acquiredAt), "dd/MM/yy h:mmaa");
  } catch {
    return props.acquiredAt;
  }
}
