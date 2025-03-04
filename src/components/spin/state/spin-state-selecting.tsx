import SpinFilters from "@/components/collection/filter-contexts/spin-filters";
import FiltersContainer from "@/components/collection/filters-container";
import SpinObjektGrid from "../spin-objekt-grid";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { useFilters } from "@/hooks/use-filters";
import { useSpinTickets } from "@/hooks/use-objekt-spin";

type Props = {
  currentUser: PublicProfile;
};

export default function StateSelecting({ currentUser }: Props) {
  const { data } = useSpinTickets();
  const { searchParams, showLocked, setShowLocked } = useFilters({
    dataSource: currentUser.dataSource,
  });

  if (data.availableTicketsCount === 0) {
    return (
      <div className="flex flex-col items-center py-6">
        <h3 className="text-lg font-bold">You have no spin tickets left</h3>
      </div>
    );
  }

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
