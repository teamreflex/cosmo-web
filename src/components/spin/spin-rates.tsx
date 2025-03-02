import { useUserState } from "@/hooks/use-user-state";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { CosmoSpinSeasonRate } from "@/lib/universal/cosmo/spin";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";

export default function SpinRates() {
  const { token, artist } = useUserState();
  const { data } = useSuspenseQuery({
    queryKey: ["spin-rates", artist],
    queryFn: () => {
      const endpoint = new URL(`/bff/v3/spin/rate/${artist}`, COSMO_ENDPOINT);
      return ofetch<CosmoSpinSeasonRate[]>(endpoint.toString(), {
        retry: false,
        headers: {
          Authorization: `Bearer ${token?.accessToken}`,
        },
      });
    },
  });

  const sortedRates = data.toSorted((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col">
      {sortedRates.map((season) => (
        <div key={season.title} className="flex flex-col">
          <span className="font-semibold">{season.title}</span>
          <ul className="list-disc">
            {season.rates.map((rate) => (
              <li key={rate.type}>
                {rate.type} - {rate.rate}%
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
