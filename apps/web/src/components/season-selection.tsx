import { Badge } from "@/components/ui/badge";
import { seasonBadgeVariant } from "@/lib/universal/seasons";
import { cn } from "@/lib/utils";

type Props = {
  seasons: string[];
  value: string[];
  onChange: (seasons: string[]) => void;
};

export default function SeasonSelection({ seasons, value, onChange }: Props) {
  function toggle(season: string) {
    const isSelected = value.includes(season);
    onChange(
      isSelected ? value.filter((s) => s !== season) : [...value, season],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((season) => (
        <Badge
          key={season}
          variant={seasonBadgeVariant(season)}
          className={cn(
            "cursor-pointer",
            value.includes(season) &&
              "border-foreground bg-foreground text-background",
          )}
          render={
            <button
              type="button"
              onClick={() => toggle(season)}
              aria-pressed={value.includes(season)}
            />
          }
        >
          {season}
        </Badge>
      ))}
    </div>
  );
}
