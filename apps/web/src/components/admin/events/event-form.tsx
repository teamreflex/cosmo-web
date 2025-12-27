import { Controller, useFormContext } from "react-hook-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { eventTypes } from "@apollo/database/web/types";
import type { Era } from "@apollo/database/web/types";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import type { CreateEventInput } from "@/lib/universal/schema/events";
import { erasQuery } from "@/lib/queries/events";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/i18n/messages";

const route = getRouteApi("/admin/events");

export default function EventForm() {
  const { data: eras } = useSuspenseQuery(erasQuery());
  const { artists } = route.useLoaderData();
  const form = useFormContext<CreateEventInput>();

  const selectedArtist = form.watch("artist");

  // Filter eras by selected artist
  const filteredEras = selectedArtist
    ? eras.filter((era) => era.artist === selectedArtist)
    : eras;
  const artistList = Object.values(artists);

  return (
    <div className="flex flex-col gap-4">
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
                <SelectValue placeholder={m.admin_event_artist_placeholder()} />
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
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
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

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="startDate"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{m.admin_event_start_date()}</FieldLabel>
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder={m.admin_era_start_date_placeholder()}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="endDate"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{m.admin_event_end_date()}</FieldLabel>
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder={m.admin_era_end_date_placeholder()}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </div>
  );
}

type EraSelectItemProps = {
  era: Era;
  artist: CosmoArtistWithMembersBFF | undefined;
};

function EraSelectItem(props: EraSelectItemProps) {
  const artistName = props.artist?.title ?? props.era.artist;

  return (
    <SelectItem value={props.era.id} className="flex items-center gap-2">
      {props.era.spotifyAlbumArt ? (
        <img
          src={props.era.spotifyAlbumArt}
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
