import AddToBinder from "@/components/binders/add-to-binder";
import AddToList from "@/components/lists/add-to-list";
import PinObjekt from "@/components/objekt/overlay/pin-button";
import { tokenKey, useObjektSelection } from "@/hooks/use-objekt-selection";
import useOverlayHover from "@/hooks/use-overlay-hover";
import { useObjektLists } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { type Hoverable, reasonLabel } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import {
  type Icon as TablerIcon,
  IconLock,
  IconMailOff,
  IconPin,
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

type TokenStatus = {
  key: Hoverable;
  icon: TablerIcon;
  label: () => string;
};

/**
 * The status shown for a token that can't be sent. A welcome objekt that can
 * be sent carries its reason but shows nothing.
 */
function tokenStatuses(token: Objekt.Token): TokenStatus[] {
  const reason = token.nonTransferableReason;
  return reason === undefined || token.transferable
    ? []
    : [{ key: reason, icon: IconMailOff, label: () => reasonLabel(reason) }];
}

export default function ActionOverlay(props: Props) {
  const { collection, token, authenticated, isLocked, isPinned, isPin } = props;
  const [hoverState, createHoverProps, hoverContainerProps] = useOverlayHover();
  const isSelected = useObjektSelection(
    useShallow((state) => state.isSelected(tokenKey(token.tokenId))),
  );
  const select = useObjektSelection((state) => state.select);

  const statuses = tokenStatuses(token);

  return (
    <CornerOverlay
      corner="top-left"
      {...hoverContainerProps}
      className={cn(
        token.transferable &&
          !isLocked &&
          !(isPinned && isPin) &&
          !authenticated &&
          "hidden",
      )}
    >
      <OverlayActionRow>
        {authenticated ? (
          <OwnerActions
            collection={collection}
            token={token}
            isLocked={isLocked}
            isPinned={isPinned}
            isPin={isPin}
            createHoverProps={createHoverProps}
          />
        ) : (
          <SpectatorIcons
            isLocked={isLocked}
            isPinned={isPinned}
            isPin={isPin}
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
  createHoverProps: CreateHoverProps;
}) {
  const { collection, token, createHoverProps } = props;
  const objektLists = useObjektLists();

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
            collection={collection}
            lists={objektLists}
            tokenId={token.tokenId}
          />
        </OverlayHoverTarget>
      )}

      {!props.isPin && (
        <OverlayHoverTarget {...createHoverProps("binder")}>
          <AddToBinder
            collectionName={collection.collectionId}
            tokenId={token.tokenId}
          />
        </OverlayHoverTarget>
      )}

      {token.transferable && !props.isPin && (
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
}) {
  return (
    <Fragment>
      {props.isPin && props.isPinned && <OverlayIcon icon={IconPin} />}
      {!props.isPin && props.isLocked && <OverlayIcon icon={IconLock} />}
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
    case "binder":
      return m.objekt_overlay_add_to_binder();
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
