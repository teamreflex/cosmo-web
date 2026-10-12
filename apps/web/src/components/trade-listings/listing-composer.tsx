import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { formatTokenRefusal } from "@/lib/client/errors/trades";
import {
  type ComposerDisplay,
  collectionShown,
  emptyComposerDisplay,
  listingComposerDisplay,
} from "@/lib/client/trade-listings";
import { $editListing, $postListing } from "@/lib/functions/trade-listings";
import {
  offeredTokenRefusalsQuery,
  rangeMatchCountQuery,
  tradeListingQuery,
  tradeListingViewerKey,
} from "@/lib/queries/trade-listings";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";
import { Objekt } from "@/lib/universal/objekt-conversion";
import {
  type ComposerMode,
  type ListingFormValues,
  type ListingSubmission,
  composerBlock,
  emptyListingForm,
  formValuesToInput,
  listingToFormValues,
} from "@/lib/universal/trade-listing-form";
import type { TokenRefusalReason } from "@/lib/universal/trade-listings";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { MAX_NOTE_LENGTH, MAX_OFFERED } from "@apollo/trades/caps";
import { totalWanted } from "@apollo/trades/composer";
import { type ListingInput, listingInputSchema } from "@apollo/trades/listing";
import { rangeFilterSchema } from "@apollo/trades/range";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconX } from "@tabler/icons-react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useId, useRef, useState } from "react";
import {
  Controller,
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "../ui/drawer";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import ComposerOffered, { ComposerPickerView } from "./composer-offered";
import ComposerWantRows from "./composer-want-rows";

type Props = {
  mode: ComposerMode;
  /** the poster's linked COSMO address, whose collection the picker lists */
  address: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Posts a trade listing, or replaces the terms of the poster's open one: the
 * objekts it offers, the rows it asks for and a note. A centred dialog on
 * desktop and a tall bottom drawer on phones; the form lives above that
 * switch, so crossing the breakpoint keeps everything entered.
 */
export default function ListingComposer({
  mode,
  address,
  open,
  onOpenChange,
}: Props) {
  const isDesktop = useMediaQuery();
  const queryClient = useQueryClient();
  const invalidateListings = useInvalidateListing(
    mode.kind === "edit" ? mode.listing.id : undefined,
  );
  const navigate = useNavigate();
  const initialValues = () =>
    mode.kind === "edit" ? listingToFormValues(mode.listing) : emptyListingForm;
  const initialDisplay = () =>
    mode.kind === "edit"
      ? listingComposerDisplay(mode.listing)
      : emptyComposerDisplay;

  const form = useForm<ListingFormValues, unknown, ListingInput>({
    resolver: standardSchemaResolver(listingInputSchema),
    defaultValues: initialValues(),
    mode: "onTouched",
  });
  const [view, setView] = useState<"form" | "picker">("form");
  const [display, setDisplay] = useState<ComposerDisplay>(initialDisplay);
  const [discarding, setDiscarding] = useState(false);
  // read during render so the form keeps it current for requestClose
  const { isDirty } = form.formState;
  // a double click submits once, even before the pending state renders
  const submitting = useRef(false);

  const mutation = useMutation({
    mutationFn: (submission: ListingSubmission) =>
      submission.kind === "create"
        ? $postListing({ data: submission.data })
        : $editListing({ data: submission.data }),
    onSuccess: (result) => {
      if (result.kind === "token_unavailable") {
        const shown = display.tokens.get(result.tokenId);
        const message = formatTokenRefusal(result.reason, {
          objekt: shown?.name ?? "",
          serial: shown?.serial ?? 0,
        });
        form.setError("offered", { message });
        toast.error(message);
        void queryClient.invalidateQueries({ queryKey: tradeListingViewerKey });
        return;
      }

      if (mode.kind === "create") {
        toast.success(m.listing_composer_posted(), {
          action: {
            label: m.listing_composer_view(),
            onClick: () =>
              void navigate({
                to: "/market/listing/$id",
                params: { id: result.listingId },
              }),
          },
        });
      } else {
        toast.success(m.listing_composer_saved());
      }
      onOpenChange(false);
      void invalidateListings();
    },
    onError: (error) => {
      if (isRateLimitErrorCode(error.message)) {
        toast.error(m.listing_composer_rate_limited_title(), {
          description: m.listing_composer_rate_limited_description(),
        });
        return;
      }

      toast.error(formatError(error));
      // the listing moved on while the dialog was open, so its terms are gone
      if (
        mode.kind === "edit" &&
        (error.message === "listing_claimed" ||
          error.message === "listing_closed" ||
          error.message === "listing_not_found")
      ) {
        onOpenChange(false);
        void invalidateListings();
      }
    },
    onSettled: () => {
      submitting.current = false;
    },
  });

  /**
   * Escape, a click outside, a swipe, Close and Cancel all land here: a
   * form with anything entered asks before throwing it away.
   */
  function requestClose(next: boolean) {
    if (!next && isDirty) setDiscarding(true);
    else onOpenChange(next);
  }

  // clearing once the close animation ends keeps the closing form intact
  function handleOpenChangeComplete(next: boolean) {
    if (next) return;
    // the offered check may have found an objekt the page still shows as fine
    if (mode.kind === "edit") {
      void queryClient.invalidateQueries({
        queryKey: tradeListingQuery(mode.listing.id).queryKey,
      });
    }
    form.reset(initialValues());
    mutation.reset();
    setView("form");
    setDisplay(initialDisplay());
  }

  function toggleOffered(objekt: CosmoObjekt) {
    const tokenId = Number(objekt.tokenId);
    const offered = form.getValues("offered");
    const options = {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    };

    if (offered.some((item) => item.tokenId === tokenId)) {
      form.setValue(
        "offered",
        offered.filter((item) => item.tokenId !== tokenId),
        options,
      );
      return;
    }
    if (offered.length >= MAX_OFFERED) return;

    const { collection, objekt: token } = Objekt.fromLegacy(objekt);
    setDisplay((current) => ({
      ...current,
      tokens: new Map(current.tokens).set(tokenId, {
        ...collectionShown(collection),
        serial: token.serial,
      }),
    }));
    form.setValue("offered", [...offered, { tokenId }], options);
  }

  function submit(values: ListingInput) {
    if (submitting.current) return;
    submitting.current = true;
    mutation.mutate(formValuesToInput(values, mode));
  }

  const title =
    mode.kind === "create"
      ? m.listing_composer_title_create()
      : m.listing_composer_title_edit();

  const shell = (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="flex min-h-0 flex-1 flex-col"
    >
      {view === "picker" ? (
        <div
          className={
            isDesktop
              ? "flex h-[min(720px,calc(100dvh-12rem))] flex-col"
              : "flex min-h-0 flex-1 flex-col"
          }
        >
          <PickerView
            form={form}
            address={address}
            onToggle={toggleOffered}
            onBack={() => setView("form")}
          />
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="border-b border-border lg:border-r lg:border-b-0">
                <OfferedSection
                  form={form}
                  display={display}
                  onAdd={() => setView("picker")}
                />
              </div>
              <ComposerWantRows
                form={form}
                display={display}
                onCollection={(collection) =>
                  setDisplay((current) => ({
                    ...current,
                    collections: new Map(current.collections).set(
                      collection.slug,
                      collectionShown(collection),
                    ),
                  }))
                }
              />
            </div>
            <NoteStrip form={form} />
          </div>
          <ComposerFooter
            form={form}
            mode={mode}
            pending={mutation.isPending}
            cancel={
              isDesktop ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestClose(false)}
                >
                  {m.common_cancel()}
                </Button>
              ) : null
            }
          />
        </>
      )}
      <DiscardDialog
        mode={mode}
        open={discarding}
        onOpenChange={setDiscarding}
        onDiscard={() => onOpenChange(false)}
      />
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={requestClose}
        onOpenChangeComplete={handleOpenChangeComplete}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-4rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1240px,calc(100%-4rem))]"
        >
          <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-3">
            <DialogTitle className="font-cosmo text-sm font-black tracking-widest uppercase">
              {title}
            </DialogTitle>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.common_close()}
                  className="ml-auto"
                />
              }
            >
              <IconX />
            </DialogClose>
          </header>
          {shell}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={requestClose}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DrawerContent className="h-[92dvh] max-h-[92dvh] gap-0 rounded-t-md p-0">
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pt-1.5 pb-3">
          <DrawerTitle className="min-w-0 flex-1 font-cosmo text-sm font-black tracking-widest uppercase">
            {title}
          </DrawerTitle>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.common_close()}
                className="-my-1 -mr-2"
              />
            }
          >
            <IconX />
          </DrawerClose>
        </header>
        {shell}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Asks before closing the composer throws away what the poster entered.
 */
function DiscardDialog({
  mode,
  open,
  onOpenChange,
  onDiscard,
}: {
  mode: ComposerMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode.kind === "create"
              ? m.listing_composer_discard_title_create()
              : m.listing_composer_discard_title_edit()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.listing_composer_discard_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {m.listing_composer_discard_keep()}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={onDiscard}
          >
            {m.listing_composer_discard_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type FormProps = {
  form: UseFormReturn<ListingFormValues, unknown, ListingInput>;
};

function OfferedSection({
  form,
  display,
  onAdd,
}: FormProps & { display: ComposerDisplay; onAdd: () => void }) {
  const offered = useWatch({ control: form.control, name: "offered" });
  const tokenIds = offered.map((item) => item.tokenId);
  const { data: refusals } = useQuery({
    ...offeredTokenRefusalsQuery(tokenIds),
    enabled: tokenIds.length > 0,
  });

  return (
    <ComposerOffered
      tokenIds={tokenIds}
      tokens={display.tokens}
      refusals={refusals ?? noRefusals}
      error={form.formState.errors.offered?.message}
      onAdd={onAdd}
      onRemove={(tokenId) =>
        form.setValue(
          "offered",
          offered.filter((item) => item.tokenId !== tokenId),
          { shouldDirty: true, shouldValidate: form.formState.isSubmitted },
        )
      }
    />
  );
}

const noRefusals: ReadonlyMap<number, TokenRefusalReason> = new Map();

function PickerView({
  form,
  address,
  onToggle,
  onBack,
}: FormProps & {
  address: string;
  onToggle: (objekt: CosmoObjekt) => void;
  onBack: () => void;
}) {
  const offered = useWatch({ control: form.control, name: "offered" });

  return (
    <ComposerPickerView
      address={address}
      picked={new Set(offered.map((item) => item.tokenId))}
      onToggle={onToggle}
      onBack={onBack}
    />
  );
}

/**
 * The optional note.
 */
function NoteStrip({ form }: FormProps) {
  const noteId = useId();

  return (
    <div className="border-t border-border bg-muted/40 px-4 py-3.5 md:px-5">
      <Controller
        control={form.control}
        name="note"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1">
            <FieldLabel
              htmlFor={noteId}
              className="text-xxs font-medium tracking-widest text-muted-foreground uppercase"
            >
              {m.listing_composer_note()}
            </FieldLabel>
            <Textarea
              id={noteId}
              rows={2}
              dir="auto"
              placeholder={m.listing_composer_note_placeholder()}
              aria-invalid={fieldState.invalid}
              className="min-h-10 resize-none"
              {...field}
              value={field.value ?? ""}
            />
            <div className="flex items-start gap-2">
              <FieldError errors={[fieldState.error]} className="text-xs" />
              <span
                className={
                  (field.value?.length ?? 0) > MAX_NOTE_LENGTH
                    ? "ml-auto font-mono text-xs text-destructive tabular-nums"
                    : "ml-auto font-mono text-xs text-muted-foreground tabular-nums"
                }
              >
                {field.value?.length ?? 0} / {MAX_NOTE_LENGTH}
              </span>
            </div>
          </Field>
        )}
      />
    </div>
  );
}

/**
 * The trade at a glance, why posting is held back when it is, and the
 * buttons. On phones the footer stays pinned under the scrolling form.
 */
function ComposerFooter({
  form,
  mode,
  pending,
  cancel,
}: FormProps & { mode: ComposerMode; pending: boolean; cancel: ReactNode }) {
  const reasonId = useId();
  const [offered, wants, note] = useWatch({
    control: form.control,
    name: ["offered", "wants", "note"],
  });
  const tokenIds = offered.map((item) => item.tokenId);
  // the offered section asks the server; this reads the answer it cached
  const { data: refusals } = useQuery({
    ...offeredTokenRefusalsQuery(tokenIds),
    enabled: tokenIds.length > 0,
  });
  // the range rows count their own matches; this reads the counts they cached
  const rangeMatches = useQueries({
    queries: wants.flatMap((want) => {
      if (want.kind !== "range") return [];
      const parsed = rangeFilterSchema.safeParse(want.filter);
      return parsed.success
        ? [{ ...rangeMatchCountQuery(parsed.data), enabled: false }]
        : [];
    }),
    combine: (results) => results.map((result) => result.data),
  });
  const reason = blockedReason(
    composerBlock({
      offered: offered.length,
      refused: tokenIds.filter((tokenId) => refusals?.has(tokenId)).length,
      wants,
      rangeMatches,
      note: note ?? "",
    }),
  );

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:px-5 md:py-3.5">
      <span className="text-center text-xs text-muted-foreground tabular-nums md:text-left">
        {m.listing_composer_footer({
          offered: m.listing_composer_footer_offered({ count: offered.length }),
          wanted: m.listing_composer_footer_wanted({
            count: totalWanted(wants),
          }),
        })}
      </span>
      {reason !== null && (
        <span
          id={reasonId}
          className="text-center text-xs text-amber-700 md:text-left dark:text-amber-500"
        >
          {reason}
        </span>
      )}
      <div className="flex gap-2 md:ml-auto">
        {cancel}
        <Button
          type="submit"
          variant="cosmo"
          disabled={reason !== null || pending}
          aria-describedby={reason === null ? undefined : reasonId}
          className="max-md:h-11 max-md:flex-1"
        >
          {mode.kind === "create"
            ? m.listing_composer_post()
            : m.listing_composer_save()}
          {pending && <Spinner />}
        </Button>
      </div>
    </div>
  );
}

function blockedReason(block: ReturnType<typeof composerBlock>) {
  switch (block) {
    case "offered":
      return m.listing_composer_reason_offered();
    case "refused":
      return m.listing_composer_reason_refused();
    case "wants":
      return m.listing_composer_reason_wants();
    case "range":
      return m.listing_composer_reason_range();
    case "range_empty":
      return m.trade_error_listing_range_empty();
    case "note":
      return m.listing_composer_reason_note({ max: MAX_NOTE_LENGTH });
    case null:
      return null;
  }
}
