import { Button } from "@/components/ui/button";
import { IconSquareArrowUp } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 100);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Button
      size="icon-lg"
      className="transition-opacity data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0"
      data-hidden={!visible}
      onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
    >
      <IconSquareArrowUp className="size-6" />
    </Button>
  );
}
