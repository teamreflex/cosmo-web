import { CosmoActivityBadgeFilterCategory } from "@/lib/universal/cosmo/activity/badges";
import { cn } from "@/lib/utils";

type Props = {
  category: CosmoActivityBadgeFilterCategory | undefined;
  subcategory: string | undefined;
  setSubcategory: (subcategory: string) => void;
};

export default function SubcategorySelector({
  category,
  subcategory,
  setSubcategory,
}: Props) {
  if (!category || category.subCategory.length === 0) return null;

  return (
    <div className="flex items-center w-full md:w-auto mx-auto">
      <div className="flex gap-2 overflow-x-scroll xl:no-scrollbar">
        {category.subCategory.map((filter) => (
          <button
            key={filter.key}
            className={cn(
              "rounded-full px-4 py-1 mb-1 text-xs font-semibold w-fit text-nowrap cursor-pointer bg-accent text-foreground transition-colors",
              filter.key === subcategory && "bg-foreground text-accent"
            )}
            onClick={() => setSubcategory(filter.key)}
          >
            {filter.value}
          </button>
        ))}
      </div>
    </div>
  );
}
