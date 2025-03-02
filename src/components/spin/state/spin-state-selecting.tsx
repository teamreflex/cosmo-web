import SpinFilters from "@/components/collection/filter-contexts/spin-filters";
import FiltersContainer from "@/components/collection/filters-container";
import SpinObjektGrid from "../spin-objekt-grid";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { useFilters } from "@/hooks/use-filters";

type Props = {
  currentUser: PublicProfile;
};

export default function StateSelecting({ currentUser }: Props) {
  const { searchParams, showLocked, setShowLocked } = useFilters({
    dataSource: currentUser.dataSource,
  });

  return (
    <div className="flex flex-col">
      <FiltersContainer>
        <SpinFilters showLocked={showLocked} setShowLocked={setShowLocked} />
      </FiltersContainer>

      {/* display */}
      <SpinObjektGrid
        currentUser={currentUser}
        searchParams={searchParams}
        showLocked={showLocked}
      />
    </div>
  );
}
