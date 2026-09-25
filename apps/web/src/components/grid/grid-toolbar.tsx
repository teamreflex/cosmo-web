import { useGridFilters } from "@/hooks/use-grid-filters";
import MemberFilter from "../collection/member-filter";
import ProgressViewSwitch from "../progress/progress-view-switch";

export default function GridToolbar() {
  const { filters, setActiveMember, setActiveArtist } = useGridFilters();

  return (
    <>
      <ProgressViewSwitch
        view="grid"
        search={{ artist: filters.artist, member: filters.member }}
      />
      <MemberFilter
        align="end"
        activeArtist={filters.artist ?? null}
        activeMembers={filters.member ? [filters.member] : []}
        updateArtist={setActiveArtist}
        updateMember={setActiveMember}
      />
    </>
  );
}
