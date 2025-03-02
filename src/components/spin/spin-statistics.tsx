import { useUserState } from "@/hooks/use-user-state";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { CosmoSpinStatisticsResponse } from "@/lib/universal/cosmo/spin";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";

export default function SpinStatistics() {
  const { token, artist } = useUserState();
  const { data } = useSuspenseQuery({
    queryKey: ["spin-statistics", artist],
    queryFn: () => {
      const endpoint = new URL(
        `/bff/v3/spin/statistic/${artist}`,
        COSMO_ENDPOINT
      );
      return ofetch<CosmoSpinStatisticsResponse>(endpoint.toString(), {
        retry: false,
        headers: {
          Authorization: `Bearer ${token?.accessToken}`,
        },
      });
    },
  });

  return (
    <div className="flex flex-col">
      {data.items.map((item) => (
        <div key={item.type}>
          <span>
            Today {item.count} people received {item.type} Class Objekt!
          </span>
        </div>
      ))}
    </div>
  );
}
