import AddToList from "@/components/lists/add-to-list";
import PinObjekt from "@/components/objekt/overlay/pin-button";
import { tokenKey, useObjektSelection } from "@/hooks/use-objekt-selection";
import useOverlayHover from "@/hooks/use-overlay-hover";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { type Hoverable, reasonLabel } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import {
  IconCloudDownload,
  IconConfetti,
  IconDevices,
  IconGrid4x4,
  IconLock,
  IconMailOff,
  IconPin,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Fragment } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  CornerOverlay,
  OverlayActionRow,
  OverlayHoverTarget,
  OverlayIcon,
  OverlayStatusRail,
} from "./corner-overlay";
import LockObjekt from "./lock-button";
import OverlayStatus from "./overlay-status";
import SelectToggleButton from "./select-toggle-button";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
  authenticated: boolean;
  isLocked: boolean;
  isPinned: boolean;
  isPin: boolean;
};

type CreateHoverProps = ReturnType<typeof useOverlayHover>[1];

type TokenTraits = {
  usedForGrid: boolean;
  isSendable: boolean;
  showActions: boolean;
};

function deriveTraits({
  token,
  authenticated,
  isLocked,
  isPinned,
  isPin,
}: Props): TokenTraits {
  // grouping uses nonTransferableReason = "challenge-reward" for gridded objekts
  const usedForGrid =
    token.usedForGrid || token.nonTransferableReason === "used-for-grid";

  // some welcome objekts are sendable; all other objekts must carry no reason
  const isSendable =
    token.transferable &&
    (token.nonTransferableReason === "welcome-objekt" ||
      token.nonTransferableReason === undefined);

  const showActions =
    !token.transferable ||
    usedForGrid ||
    isLocked ||
    (isPinned && isPin) ||
    authenticated;

  return { usedForGrid, isSendable, showActions };
}

type TokenStatus = {
  key: Hoverable;
  icon: TablerIcon;
  label: () => string;
};

/**
 * Statuses shown for the token, in render order. Multiple can apply at once
 * (e.g. used-for-grid + lenticular). "effect-objekt" and "bookmark-objekt"
 * never occur in API data, so they intentionally have no entries.
 */
function tokenStatuses(
  token: Objekt.Token,
  { usedForGrid, isSendable }: TokenTraits,
): TokenStatus[] {
  const reason = token.nonTransferableReason;
  const statuses: TokenStatus[] = [];
  if (reason === "not-transferable") {
    statuses.push({
      key: reason,
      icon: IconMailOff,
      label: () => reasonLabel(reason),
    });
  }
  if (reason === "mint-pending") {
    statuses.push({
      key: reason,
      icon: IconCloudDownload,
      label: () => reasonLabel(reason),
    });
  }
  if (!usedForGrid && reason === "challenge-reward") {
    statuses.push({
      key: reason,
      icon: IconConfetti,
      label: () => reasonLabel(reason),
    });
  }
  if (!isSendable && reason === "welcome-objekt") {
    statuses.push({
      key: reason,
      icon: IconMailOff,
      label: () => reasonLabel(reason),
    });
  }
  if (usedForGrid) {
    statuses.push({
      key: "used-for-grid",
      icon: IconGrid4x4,
      label: () => reasonLabel("used-for-grid"),
    });
  }
  // used in lenticular, for some reason the nonTransferableReason isn't used here
  if (token.lenticularPairTokenId !== 0) {
    statuses.push({
      key: "lenticular-objekt",
      icon: IconDevices,
      label: m.objekt_overlay_lenticular_pair,
    });
  }
  return statuses;
}

export default function ActionOverlay(props: Props) {
  const { collection, token, authenticated, isLocked, isPinned, isPin } = props;
  const [hoverState, createHoverProps, hoverContainerProps] = useOverlayHover();
  const isSelected = useObjektSelection(
    useShallow((state) => state.isSelected(tokenKey(token.tokenId))),
  );
  const select = useObjektSelection((state) => state.select);

  const traits = deriveTraits(props);
  const statuses = tokenStatuses(token, traits);

  return (
    <CornerOverlay
      corner="top-left"
      {...hoverContainerProps}
      className={cn(!traits.showActions && "hidden")}
    >
      <OverlayActionRow>
        {authenticated ? (
          <OwnerActions
            collection={collection}
            token={token}
            isLocked={isLocked}
            isPinned={isPinned}
            isPin={isPin}
            isSendable={traits.isSendable}
            createHoverProps={createHoverProps}
          />
        ) : (
          <SpectatorIcons
            isLocked={isLocked}
            isPinned={isPinned}
            isPin={isPin}
            usedForGrid={traits.usedForGrid}
          />
        )}

        {!isPin && (
          <div className="contents">
            {statuses.map((status) => (
              <OverlayHoverTarget
                key={status.key}
                {...createHoverProps(status.key)}
              >
                <OverlayIcon icon={status.icon} />
              </OverlayHoverTarget>
            ))}
          </div>
        )}

        {authenticated && !isPin && (
          <OverlayHoverTarget {...createHoverProps("select")}>
            <SelectToggleButton
              isSelected={isSelected}
              onClick={() => select({ type: "token", collection, token })}
            />
          </OverlayHoverTarget>
        )}
      </OverlayActionRow>

      <OverlayStatusRail>
        <StatusText
          hoverState={hoverState}
          statuses={statuses}
          hasReason={token.nonTransferableReason !== undefined}
          isLocked={isLocked}
          isPinned={isPinned}
          isPin={isPin}
          isSelected={isSelected}
        />
      </OverlayStatusRail>
    </CornerOverlay>
  );
}

function OwnerActions(props: {
  collection: Objekt.Collection;
  token: Objekt.Token;
  isLocked: boolean;
  isPinned: boolean;
  isPin: boolean;
  isSendable: boolean;
  createHoverProps: CreateHoverProps;
}) {
  const { collection, token, createHoverProps } = props;
  const objektLists = useProfileContext((ctx) => ctx.objektLists);

  return (
    <Fragment>
      <OverlayHoverTarget {...createHoverProps("pin")}>
        <PinObjekt
          collectionId={collection.collectionId}
          tokenId={token.tokenId}
          isPinned={props.isPinned}
        />
      </OverlayHoverTarget>

      {!props.isPin && (
        <OverlayHoverTarget {...createHoverProps("list")}>
          <AddToList
            collectionName={collection.collectionId}
            slug={collection.slug}
            collectionId={collection.id}
            lists={objektLists}
            tokenId={token.tokenId}
          />
        </OverlayHoverTarget>
      )}

      {props.isSendable && !props.isPin && (
        <OverlayHoverTarget {...createHoverProps("lock")}>
          <LockObjekt tokenId={token.tokenId} isLocked={props.isLocked} />
        </OverlayHoverTarget>
      )}
    </Fragment>
  );
}

/** Read-only pin/lock indicators shown when viewing another user's profile. */
function SpectatorIcons(props: {
  isLocked: boolean;
  isPinned: boolean;
  isPin: boolean;
  usedForGrid: boolean;
}) {
  return (
    <Fragment>
      {props.isPin && props.isPinned && <OverlayIcon icon={IconPin} />}
      {!props.usedForGrid && !props.isPin && props.isLocked && (
        <OverlayIcon icon={IconLock} />
      )}
    </Fragment>
  );
}

type StatusTextProps = {
  hoverState: Hoverable | undefined;
  statuses: TokenStatus[];
  hasReason: boolean;
  isLocked: boolean;
  isPinned: boolean;
  isPin: boolean;
  isSelected: boolean;
};

/** The label for the hovered action button, or null for status-icon hovers. */
function actionHoverLabel(props: StatusTextProps): string | null {
  switch (props.hoverState) {
    case "list":
      return m.objekt_overlay_add_to_list();
    case "lock":
      return props.isLocked
        ? m.objekt_overlay_unlock()
        : m.objekt_overlay_lock();
    case "pin":
      return props.isPinned ? m.objekt_overlay_unpin() : m.objekt_overlay_pin();
    case "select":
      return props.isSelected
        ? m.objekt_overlay_deselect()
        : m.objekt_overlay_select();
    default:
      return null;
  }
}

function StatusText(props: StatusTextProps) {
  if (props.isPin) {
    return <OverlayStatus>{m.objekt_overlay_pinned()}</OverlayStatus>;
  }

  const hoverLabel = actionHoverLabel(props);

  return (
    <div className="contents">
      {hoverLabel && <OverlayStatus>{hoverLabel}</OverlayStatus>}
      {props.statuses.map((status) => (
        <OverlayStatus key={status.key}>{status.label()}</OverlayStatus>
      ))}
      {props.hoverState === undefined && !props.hasReason && (
        <OverlayStatus>
          {props.isLocked ? m.common_locked() : m.objekt_overlay_unlocked()}
        </OverlayStatus>
      )}
    </div>
  );
}
