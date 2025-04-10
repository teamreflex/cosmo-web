"use client";

import { useObjektOverlay } from "@/store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Eye, EyeOff } from "lucide-react";

export default function HideOverlay() {
  const isHidden = useObjektOverlay((state) => state.isHidden);
  const toggle = useObjektOverlay((state) => state.toggle);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggle}
            className="flex items-center justify-center p-1 rounded-full bg-cosmo size-12 aspect-square drop-shadow-sm ring-0"
          >
            {isHidden ? (
              <Eye className="text-white size-8" />
            ) : (
              <EyeOff className="text-white size-8" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Toggle objekt buttons</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
