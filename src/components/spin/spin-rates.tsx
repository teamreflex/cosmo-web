import { useUserState } from "@/hooks/use-user-state";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { CosmoSpinSeasonRate } from "@/lib/universal/cosmo/spin";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <Accordion type="single" defaultValue="rates" collapsible>
      <AccordionItem key="rates" value="rates">
        <AccordionTrigger className="pt-0">Drop Rates</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          {sortedRates.map((season) => (
            <div key={season.title} className="flex flex-col">
              <span className="font-semibold">{season.title}</span>
              <span className="text-sm text-muted-foreground">
                {season.rates
                  .map((rate) => `${rate.type}: ${rate.rate}%`)
                  .join(" / ")}
              </span>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
