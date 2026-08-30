import SeasonSelection from "@/components/season-selection";
import { Button } from "@/components/ui/button";
import { useArtists } from "@/hooks/use-artists";
import { getSeasonKeys } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import type {
  ScrapeCandidate,
  ScrapeSelection,
} from "@/lib/universal/schema/share-data";
import { cn } from "@/lib/utils";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useState } from "react";

type Props = {
  candidates: ScrapeCandidate[];
  onContinue: (selection: ScrapeSelection[]) => void;
};

export default function SelectStep({ candidates, onContinue }: Props) {
  const { getArtist } = useArtists();

  function availableArtists(type: ScrapeCandidate["type"]) {
    const ids = new Set(
      candidates.filter((c) => c.type === type).map((c) => c.artist),
    );
    return [...ids]
      .map((id) => getArtist(id))
      .filter((artist) => artist !== undefined)
      .sort((a, b) => a.comoTokenId - b.comoTokenId);
  }

  const motionArtists = availableArtists("motion");
  const bandArtists = availableArtists("band");
  const audioArtists = availableArtists("audio");

  function audioSeasons(artistId: ValidArtist) {
    const artist = artistId.toLowerCase();
    const seasons = new Set(
      candidates
        .filter((c) => c.type === "audio" && c.artist === artist)
        .map((c) => c.season),
    );
    return [...seasons].sort();
  }

  const [motion, setMotion] = useState<ValidArtist[]>([]);
  const [band, setBand] = useState<ValidArtist[]>([]);
  const [audio, setAudio] = useState<Partial<Record<ValidArtist, string[]>>>(
    {},
  );

  function toggle(list: ValidArtist[], artistId: ValidArtist) {
    return list.includes(artistId)
      ? list.filter((id) => id !== artistId)
      : [...list, artistId];
  }

  function toggleAudio(artistId: ValidArtist) {
    setAudio((prev) => {
      const { [artistId]: current, ...rest } = prev;
      return current !== undefined
        ? rest
        : { ...rest, [artistId]: audioSeasons(artistId) };
    });
  }

  function setAudioSeasons(artistId: ValidArtist, seasons: string[]) {
    setAudio((prev) => {
      const { [artistId]: _, ...rest } = prev;
      return seasons.length > 0 ? { ...rest, [artistId]: seasons } : rest;
    });
  }

  const selection: ScrapeSelection[] = [
    ...motion.map((artistId) => ({ type: "motion" as const, artistId })),
    ...band.map((artistId) => ({ type: "band" as const, artistId })),
    ...Object.entries(audio).map(([artistId, seasons]) => ({
      type: "audio" as const,
      // SAFETY: audio state is keyed by ValidArtist
      artistId: artistId as ValidArtist,
      seasons,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {m.share_data_select_description()}
      </p>

      {motionArtists.length > 0 && (
        <Section
          title={m.share_data_motion_title()}
          description={m.share_data_motion_description()}
        >
          <div className="flex flex-wrap gap-2">
            {motionArtists.map((artist) => (
              <ArtistChip
                key={artist.id}
                artist={artist}
                selected={motion.includes(artist.id)}
                onToggle={() => setMotion((prev) => toggle(prev, artist.id))}
              />
            ))}
          </div>
        </Section>
      )}

      {bandArtists.length > 0 && (
        <Section
          title={m.share_data_sidebar_title()}
          description={m.share_data_sidebar_description()}
        >
          <div className="flex flex-wrap gap-2">
            {bandArtists.map((artist) => (
              <ArtistChip
                key={artist.id}
                artist={artist}
                selected={band.includes(artist.id)}
                onToggle={() => setBand((prev) => toggle(prev, artist.id))}
              />
            ))}
          </div>
        </Section>
      )}

      {audioArtists.length > 0 && (
        <Section
          title={m.share_data_audio_title()}
          description={m.share_data_audio_description()}
        >
          <div className="flex flex-wrap gap-2">
            {audioArtists.map((artist) => (
              <ArtistChip
                key={artist.id}
                artist={artist}
                selected={audio[artist.id] !== undefined}
                onToggle={() => toggleAudio(artist.id)}
              />
            ))}
          </div>

          {audioArtists
            .filter((artist) => audio[artist.id] !== undefined)
            .map((artist) => (
              <div key={artist.id} className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {audioArtists.length > 1
                    ? `${artist.title} · ${m.share_data_seasons()}`
                    : m.share_data_seasons()}
                </span>
                <SeasonSelection
                  seasons={getSeasonKeys(audioSeasons(artist.id))}
                  value={audio[artist.id] ?? []}
                  onChange={(seasons) => setAudioSeasons(artist.id, seasons)}
                />
              </div>
            ))}
        </Section>
      )}

      <Button
        className="mx-auto mt-2 w-fit"
        disabled={selection.length === 0}
        onClick={() => onContinue(selection)}
      >
        {m.common_continue()}
      </Button>
    </div>
  );
}

type SectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-border p-4">
      <div className="flex flex-col">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

type ArtistChipProps = {
  artist: CosmoArtistWithMembersBFF;
  selected: boolean;
  onToggle: () => void;
};

function ArtistChip({ artist, selected, onToggle }: ArtistChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border border-input pr-3 pl-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted",
        selected &&
          "border-transparent bg-cosmo text-white hover:bg-cosmo-hover",
      )}
    >
      <img
        src={artist.logoImageUrl}
        alt={artist.title}
        className="size-4 shrink-0 rounded-full"
      />
      <span>{artist.title}</span>
    </button>
  );
}
