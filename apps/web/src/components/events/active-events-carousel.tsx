import { useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import type { EventWithEra } from "@apollo/database/web/types";
import type { CarouselApi } from "@/components/ui/carousel";
import EventCardLarge from "@/components/events/event-card-large";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

type ActiveEventsCarouselProps = {
  events: EventWithEra[];
  onActiveChange: (event: EventWithEra | null) => void;
  onHoverChange: (event: EventWithEra | null) => void;
};

export default function ActiveEventsCarousel(props: ActiveEventsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const autoplay = useRef(
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  // track active slide and emit to parent
  useEffect(() => {
    if (!api || props.events.length === 0) return;

    const updateActiveEvent = () => {
      const index = api.selectedScrollSnap();
      setActiveIndex(index);
      props.onActiveChange(props.events[index] || null);
    };

    api.on("select", updateActiveEvent);

    return () => {
      api.off("select", updateActiveEvent);
    };
  }, [api, props.events, props.onActiveChange]);

  if (props.events.length === 0) {
    return null;
  }

  return (
    <div className="relative z-10 mt-4">
      <Carousel
        opts={{
          loop: true,
          align: "center",
        }}
        plugins={[autoplay.current]}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-6 sm:-ml-8 md:-ml-4">
          {props.events.map((event, index) => (
            <CarouselItem
              key={event.id}
              className="basis-4/5 pl-6 sm:pl-8 md:basis-2/5 md:pl-4 lg:basis-1/4"
            >
              <EventCardLarge
                event={event}
                isActive={index === activeIndex}
                onMouseEnter={() => props.onHoverChange(event)}
                onMouseLeave={() => props.onHoverChange(null)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
