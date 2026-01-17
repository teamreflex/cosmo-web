import EventImageUpload from "@/components/admin/events/event-image-upload";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FilterData } from "@/hooks/use-filter-data";
import { getSeasonKeys } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { adminErasQuery } from "@/lib/queries/events";
import type { CreateEventInput } from "@/lib/universal/schema/events";
import { cn } from "@/lib/utils";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import { eventTypes } from "@apollo/database/web/types";
import type { Era } from "@apollo/database/web/types";
import { slugify } from "@apollo/util";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Controller, useFormContext, useWatch } from "react-hook-form";

const route = getRouteApi("/admin/events");

type EventFormProps = {
  existingImageUrl?: string;
  onImageSelect: (file: File | null) => void;
  onImageClear: () => void;
};

export default function EventForm({
  existingImageUrl,
  onImageSelect,
  onImageClear,
}: EventFormProps) {
  const { data: eras } = useSuspenseQuery(adminErasQuery());
  const { artists, filterData } = route.useLoaderData();
  const form = useFormContext<CreateEventInput>();

  const selectedArtist = useWatch({ control: form.control, name: "artist" });

  // filter eras by selected artist
  const filteredEras = selectedArtist
    ? eras.filter((era) => era.artist === selectedArtist)
    : eras;

  const artistList = Object.values(artists);
  const eventTypesList = Object.values(eventTypes);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Artist */}
        <Controller
          control={form.control}
          name="artist"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="artist">{m.admin_event_artist()}</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("eraId", "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={m.admin_event_artist_placeholder()}
                  />
                </SelectTrigger>
                <SelectContent>
                  {artistList.map((artist) => (
                    <SelectItem
                      key={artist.id}
                      value={artist.id}
                      className="flex items-center gap-2"
                    >
                      <img
                        src={artist.logoImageUrl}
                        alt={artist.title}
                        className="aspect-square size-4 rounded-full"
                      />
                      <span>{artist.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {/* Era */}
        <Controller
          control={form.control}
          name="eraId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="eraId">{m.admin_event_era()}</FieldLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!selectedArtist && filteredEras.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={m.admin_event_era_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {filteredEras.map((era) => (
                    <EraSelectItem
                      key={era.id}
                      era={era}
                      artist={artists[era.artist]}
                    />
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      {/* Event Type */}
      <Controller
        control={form.control}
        name="eventType"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="eventType">{m.admin_event_type()}</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={m.admin_event_type_placeholder()} />
              </SelectTrigger>
              <SelectContent>
                {eventTypesList.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Name */}
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="name">{m.admin_event_name()}</FieldLabel>
            <Input
              id="name"
              placeholder={m.admin_event_name_placeholder()}
              {...field}
              onChange={(e) => {
                field.onChange(e);
                form.setValue("slug", slugify(e.target.value));
              }}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Slug */}
      <Controller
        control={form.control}
        name="slug"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="slug">{m.admin_event_slug()}</FieldLabel>
            <Input
              id="slug"
              placeholder={m.admin_event_slug_placeholder()}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Description */}
      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="description">
              {m.admin_event_description()}
            </FieldLabel>
            <Textarea
              id="description"
              placeholder={m.admin_event_description_placeholder()}
              rows={3}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Event Image */}
      <Field>
        <FieldLabel htmlFor="imageUrl">{m.admin_event_image()}</FieldLabel>
        <EventImageUpload
          existingUrl={existingImageUrl}
          onFileSelect={onImageSelect}
          onClear={onImageClear}
        />
      </Field>

      {/* Seasons */}
      <SeasonSelection seasons={filterData.seasons} artist={selectedArtist} />

      {/* Twitter URL */}
      <Controller
        control={form.control}
        name="twitterUrl"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="twitterUrl">
              {m.admin_event_twitter_url()}
            </FieldLabel>
            <Input
              id="twitterUrl"
              type="url"
              placeholder="https://x.com/..."
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Discord URL */}
      <Controller
        control={form.control}
        name="discordUrl"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="discordUrl">
              {m.admin_event_discord_url()}
            </FieldLabel>
            <Input
              id="discordUrl"
              type="url"
              placeholder="https://discord.gg/..."
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* start date */}
      <Controller
        control={form.control}
        name="startDate"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{m.admin_event_start_date()}</FieldLabel>
            <DateTimePicker
              value={field.value}
              onChange={field.onChange}
              placeholder={m.admin_era_start_date_placeholder()}
              side="bottom"
            />
            <p className="text-xs text-muted-foreground">
              {m.admin_event_timezone_hint()}
            </p>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* end date */}
      <Controller
        control={form.control}
        name="endDate"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{m.admin_event_end_date()}</FieldLabel>
            <DateTimePicker
              value={field.value}
              onChange={field.onChange}
              placeholder={m.admin_era_end_date_placeholder()}
              side="bottom"
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </div>
  );
}

type EraSelectItemProps = {
  era: Era;
  artist: CosmoArtistWithMembersBFF | undefined;
};

function EraSelectItem(props: EraSelectItemProps) {
  const artistName = props.artist?.title ?? props.era.artist;
  const imageUrl = props.era.spotifyAlbumArt || props.era.imageUrl;

  return (
    <SelectItem value={props.era.id} className="flex items-center gap-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={props.era.name}
          className="aspect-square size-4 rounded"
        />
      ) : (
        <div className="size-4 rounded bg-muted" />
      )}
      <span>{`${props.era.name} • ${artistName}`}</span>
    </SelectItem>
  );
}

type SeasonSelectionProps = {
  seasons: FilterData["seasons"];
  artist: string | undefined;
};

function SeasonSelection(props: SeasonSelectionProps) {
  const form = useFormContext<CreateEventInput>();

  if (!props.artist) {
    return null;
  }

  const seasons = getSeasonKeys(
    props.seasons.find((s) => s.artistId === props.artist!.toLowerCase())
      ?.seasons ?? [],
  );

  return (
    <Controller
      control={form.control}
      name="seasons"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="seasons">Seasons</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {seasons.map((season) => (
              <Badge
                key={`${props.artist}-${season.key}-${season.name}`}
                variant={`season-${season.key}` as "season-atom"}
                className={cn(
                  field.value.includes(season.name) &&
                    "border-foreground bg-foreground text-background",
                )}
                asChild
              >
                <button
                  type="button"
                  onClick={() => {
                    const isSelected = field.value.includes(season.name);
                    field.onChange(
                      isSelected
                        ? field.value.filter((s) => s !== season.name)
                        : [...field.value, season.name],
                    );
                  }}
                >
                  {season.name}
                </button>
              </Badge>
            ))}
          </div>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
