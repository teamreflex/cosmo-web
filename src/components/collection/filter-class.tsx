import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, isEqual } from "@/lib/utils";
import { useFilterData } from "@/hooks/use-filter-data";

type Props = {
  classes: CosmoFilters["class"];
  artist: CosmoFilters["artist"];
  onChange: SetCosmoFilters;
};

export default function ClassFilter(props: Props) {
  const { classes } = useFilterData();
  const [open, setOpen] = useState(false);

  function handleChange(artistId: string, className: string, checked: boolean) {
    props.onChange((prev) => {
      // allow switching artist without needing to uncheck
      if (prev.artist !== artistId) {
        return {
          artist: artistId as ValidArtist,
          class: [className],
        };
      }

      const newFilters = checked
        ? [...(props.classes ?? []), className]
        : (props.classes ?? []).filter((f) => f !== className);

      return {
        artist: newFilters.length > 0 ? artistId : null,
        class: newFilters.length > 0 ? newFilters : null,
      };
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex gap-2 items-center",
            (props.classes?.length ?? 0) > 0 && "dark:border-cosmo border-cosmo"
          )}
        >
          <span>Class</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-row gap-2">
        {classes.map(({ artist: classArtist, classes: classNames }) => (
          <DropdownMenuGroup key={classArtist.id}>
            <DropdownMenuLabel className="text-xs flex items-center gap-2">
              <img
                className="rounded-full aspect-square size-4"
                src={classArtist.logoImageUrl}
                alt={classArtist.title}
              />
              {classArtist.title}
            </DropdownMenuLabel>
            {classNames.map((className) => (
              <DropdownMenuCheckboxItem
                key={className}
                checked={
                  isEqual(classArtist.id, props.artist ?? undefined) &&
                  (props.classes?.includes(className) ?? false)
                }
                onCheckedChange={(checked) =>
                  handleChange(classArtist.id, className, checked)
                }
              >
                {className}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
