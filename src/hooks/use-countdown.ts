import { useEffect, useState } from "react";

export function useCooldown() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        setCount((c) => c - 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCount(5);
    }
  }, [open]);

  return { open, setOpen, count };
}
