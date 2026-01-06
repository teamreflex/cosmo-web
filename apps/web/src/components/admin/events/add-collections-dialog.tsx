import CollectionNumberInput from "@/components/admin/events/collection-number-input";
import MemberSelection from "@/components/admin/events/member-selection";
import SeasonSelection from "@/components/admin/events/season-selection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { getSeasonKeys } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import {
  adminEventCollectionsQuery,
  adminEventsQuery,
} from "@/lib/queries/events";
import { $addCollectionsToEvent } from "@/lib/server/events/actions";
import { cn } from "@/lib/utils";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import { slugify } from "@apollo/util";
import { IconLoader2, IconPlus, IconUpload } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const route = getRouteApi("/admin/events");

type Props = {
  eventId: string;
  eventName: string;
  artist: CosmoArtistWithMembersBFF;
};

export default function AddCollectionsDialog({
  eventId,
  eventName,
  artist,
}: Props) {
  const { filterData } = route.useLoaderData();
  const [open, setOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [collectionNumbers, setCollectionNumbers] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $addCollectionsToEvent,
    onSuccess: async (data) => {
      toast.success(m.admin_collections_added({ count: data as number }));
      resetForm();
      await queryClient.invalidateQueries({
        queryKey: adminEventsQuery().queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: adminEventCollectionsQuery(eventId).queryKey,
      });
      setOpen(false);
    },
    onError: () => {
      toast.error(m.error_unknown());
    },
  });

  const artistMembers = artist.artistMembers.map((m) => m.name);
  const availableSeasons = getSeasonKeys(
    filterData.seasons.find((s) => s.artistId === artist.id)?.seasons ?? [],
  );

  const expandedSlugs = useMemo(() => {
    if (
      selectedMembers.length === 0 ||
      selectedSeasons.length === 0 ||
      collectionNumbers.length === 0
    ) {
      return [];
    }
    return expandMatrix(selectedSeasons, selectedMembers, collectionNumbers);
  }, [selectedMembers, selectedSeasons, collectionNumbers]);

  const canSubmit = expandedSlugs.length > 0;

  function resetForm() {
    setSelectedMembers([]);
    setSelectedSeasons([]);
    setCollectionNumbers([]);
    setDescription("");
  }

  function handleSubmit() {
    if (!canSubmit) return;

    const collections = expandedSlugs.map((slug) => ({
      collectionId: slug,
      description: description || undefined,
    }));

    mutation.mutate({
      data: { eventId, collections },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <IconPlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{m.admin_add_collections()}</DialogTitle>
          <DialogDescription>{eventName}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="flex flex-col gap-4">
            {/* Members */}
            <MemberSelection
              members={artistMembers}
              value={selectedMembers}
              onChange={setSelectedMembers}
            />

            {/* Seasons */}
            <Field>
              <FieldLabel>{m.admin_matrix_seasons()}</FieldLabel>
              <SeasonSelection
                seasons={availableSeasons}
                value={selectedSeasons}
                onChange={setSelectedSeasons}
              />
            </Field>

            {/* Collection Numbers */}
            <Field>
              <FieldLabel>{m.admin_matrix_collection_numbers()}</FieldLabel>
              <CollectionNumberInput
                value={collectionNumbers}
                onChange={setCollectionNumbers}
              />
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel>{m.admin_matrix_description()}</FieldLabel>
              <Textarea
                placeholder={m.admin_matrix_description_placeholder()}
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Leaving the description empty will skip updating this field.
                Good for re-assigning event.
              </p>
            </Field>
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {m.admin_matrix_preview({ count: expandedSlugs.length })}
            </p>
            <div
              className={cn(
                "h-64 overflow-y-auto rounded-md border bg-muted/50 p-2",
                expandedSlugs.length === 0 && "border-dashed",
              )}
            >
              {expandedSlugs.length > 0 ? (
                <ul className="flex flex-col gap-1 font-mono text-xs">
                  {expandedSlugs.map((slug) => (
                    <li key={slug} className="truncate">
                      {slug}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {m.admin_matrix_preview_empty()}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Collections will be upserted. If a collection already exists, its
              description will be overwritten and event will be updated.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !canSubmit}
          >
            {mutation.isPending ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconUpload className="size-4" />
            )}
            <span>{m.admin_add_collections()}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function expandMatrix(
  seasons: string[],
  members: string[],
  collections: string[],
): string[] {
  const slugs: string[] = [];
  for (const season of seasons) {
    for (const member of members) {
      for (const collection of collections) {
        slugs.push(slugify(`${season}-${member}-${collection}`));
      }
    }
  }
  return slugs;
}
