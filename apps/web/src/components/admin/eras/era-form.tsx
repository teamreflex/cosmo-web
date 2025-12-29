import SelectSpotifyAlbum from "@/components/admin/events/select-spotify-album";
import { DatePicker } from "@/components/ui/date-picker";
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
import { m } from "@/i18n/messages";
import type { SpotifyAlbum } from "@/lib/universal/events";
import type { CreateEraInput } from "@/lib/universal/schema/events";
import { getRouteApi } from "@tanstack/react-router";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import EraImageUpload from "./era-image-upload";
import SpotifyAlbumDisplay from "./spotify-album-display";

const route = getRouteApi("/admin/eras");

type Props = {
  selectedAlbum: SpotifyAlbum | null;
  onAlbumSelect: (album: SpotifyAlbum) => void;
  onAlbumClear: () => void;
  existingImageUrl?: string;
  onImageSelect: (file: File | null) => void;
  onImageClear: () => void;
};

export default function EraForm(props: Props) {
  const { artists } = route.useLoaderData();
  const form = useFormContext<CreateEraInput>();
  const spotifyAlbumId = useWatch({
    control: form.control,
    name: "spotifyAlbumId",
  });

  const hasAlbum = props.selectedAlbum || spotifyAlbumId;

  return (
    <div className="flex flex-col gap-4">
      {/* Spotify Album Selector */}
      <Field>
        <FieldLabel>{m.admin_era_spotify_album()}</FieldLabel>
        {hasAlbum ? (
          <SpotifyAlbumDisplay
            selectedAlbum={props.selectedAlbum}
            spotifyAlbumId={spotifyAlbumId}
            onClear={props.onAlbumClear}
          />
        ) : (
          <SelectSpotifyAlbum
            onSelect={props.onAlbumSelect}
            selectedAlbum={props.selectedAlbum}
          />
        )}
      </Field>

      {/* Custom Image (for eras without Spotify album) */}
      {!hasAlbum && (
        <Field>
          <FieldLabel>{m.admin_era_image()}</FieldLabel>
          <EraImageUpload
            existingUrl={props.existingImageUrl}
            onFileSelect={props.onImageSelect}
            onClear={props.onImageClear}
          />
        </Field>
      )}

      {/* Artist */}
      <Controller
        control={form.control}
        name="artist"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="artist">{m.admin_era_artist()}</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={m.admin_era_artist_placeholder()} />
              </SelectTrigger>
              <SelectContent>
                {artists.map((artist) => (
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

      {/* Name */}
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="name">{m.admin_era_name()}</FieldLabel>
            <Input
              id="name"
              placeholder={m.admin_era_name_placeholder()}
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
            <FieldLabel htmlFor="slug">{m.admin_era_slug()}</FieldLabel>
            <Input
              id="slug"
              placeholder={m.admin_era_slug_placeholder()}
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
              {m.admin_era_description()}
            </FieldLabel>
            <Textarea
              id="description"
              placeholder={m.admin_era_description_placeholder()}
              rows={3}
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
              <FieldLabel>{m.admin_era_start_date()}</FieldLabel>
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder={m.admin_era_start_date_placeholder()}
                side="bottom"
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
              <FieldLabel>{m.admin_era_end_date()}</FieldLabel>
              <DatePicker
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
    </div>
  );
}
