import {
  CosmoCombinationPollFinalized,
  CosmoPastGravity,
  CosmoSinglePollFinalized,
} from "@/lib/universal/cosmo/gravity";
import GravityRankingCarousel from "./gravity-ranking-carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type GravityRankingProps = {
  gravity: CosmoPastGravity;
  totalComoUsed: number;
};

export default function GravityRanking({
  gravity,
  totalComoUsed,
}: GravityRankingProps) {
  switch (gravity.pollType) {
    case "single-poll":
      return (
        <SingleRanking
          poll={gravity.polls[0] as CosmoSinglePollFinalized}
          totalComoUsed={totalComoUsed}
        />
      );
    case "combination-poll":
      return (
        <CombinationRanking
          polls={gravity.polls as CosmoCombinationPollFinalized[]}
          totalComoUsed={totalComoUsed}
        />
      );
    default:
      return null;
  }
}

type SingleRankingProps = {
  poll: CosmoSinglePollFinalized;
  totalComoUsed: number;
};

function SingleRanking({ poll, totalComoUsed }: SingleRankingProps) {
  return (
    <div className="flex flex-col bg-accent rounded-xl w-full">
      <div className="flex items-center justify-between gap-2 p-3 pb-0">
        <span className="font-bold">Result</span>
        <span className="text-sm font-semibold">
          {totalComoUsed.toLocaleString()} COMO
        </span>
      </div>

      <GravityRankingCarousel poll={poll} />
    </div>
  );
}

type CombinationRankingProps = {
  polls: CosmoCombinationPollFinalized[];
  totalComoUsed: number;
};

function CombinationRanking({ polls, totalComoUsed }: CombinationRankingProps) {
  const defaultOpen = polls[0].id.toString();

  return (
    <div className="flex flex-col text-sm gap-2 p-3 w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">All Results</span>
        <span className="text-sm font-semibold">
          {totalComoUsed.toLocaleString()} COMO
        </span>
      </div>

      <Accordion type="single" defaultValue={defaultOpen} collapsible>
        {polls.map((poll) => (
          <AccordionItem key={poll.id.toString()} value={poll.id.toString()}>
            <AccordionTrigger>{poll.title}</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 items-center bg-accent rounded-xl">
                <GravityRankingCarousel poll={poll} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
