import {
  CosmoCombinationPollFinalized,
  CosmoPastGravity,
  CosmoPollFinalized,
  CosmoSinglePollFinalized,
} from "@/lib/universal/cosmo/gravity";
import GravityRankingCarousel from "./gravity-ranking-carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

type GravityRankingProps = {
  gravity: CosmoPastGravity;
};

export default function GravityRanking({ gravity }: GravityRankingProps) {
  switch (gravity.pollType) {
    case "single-poll":
      return (
        <SingleRanking poll={gravity.polls[0] as CosmoSinglePollFinalized} />
      );
    case "combination-poll":
      return (
        <CombinationRanking
          polls={gravity.polls as CosmoCombinationPollFinalized[]}
        />
      );
    default:
      return null;
  }
}

function SingleRanking({ poll }: { poll: CosmoSinglePollFinalized }) {
  return (
    <div className="flex flex-col bg-accent rounded-xl w-full">
      <p className="font-bold p-3 pb-0">Result</p>
      <GravityRankingCarousel poll={poll} />
    </div>
  );
}

function CombinationRanking({
  polls,
}: {
  polls: CosmoCombinationPollFinalized[];
}) {
  const defaultOpen = polls[0].id.toString();

  return (
    <div className="flex flex-col text-sm gap-2 w-full">
      <Accordion type="single" defaultValue={defaultOpen} collapsible>
        {polls.map((poll) => (
          <AccordionItem key={poll.id.toString()} value={poll.id.toString()}>
            <AccordionTrigger>Result of {poll.title}</AccordionTrigger>
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
