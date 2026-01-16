import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Season = {
  key: string;
  name: string;
};

type Props = {
  seasons: Season[];
  value: string[];
  onChange: (seasons: string[]) => void;
};

export default function SeasonSelection({ seasons, value, onChange }: Props) {
  function toggle(seasonName: string) {
    const isSelected = value.includes(seasonName);
    onChange(
      isSelected
        ? value.filter((s) => s !== seasonName)
        : [...value, seasonName],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((season) => (
        <Badge
          key={`${season.key}-${season.name}`}
          variant={`season-${season.key}` as "season-atom"}
          className={cn(
            "cursor-pointer",
            value.includes(season.name) &&
              "border-foreground bg-foreground text-background",
          )}
          asChild
        >
          <button type="button" onClick={() => toggle(season.name)}>
            {season.name}
          </button>
        </Badge>
      ))}
    </div>
  );
}
