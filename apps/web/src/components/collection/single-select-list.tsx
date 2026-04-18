import { cn } from "@/lib/utils";

export type SingleSelectOption<T extends string> = {
  value: T;
  label: string;
  sublabel?: string;
};

type Props<T extends string> = {
  options: SingleSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  close?: () => void;
};

export default function SingleSelectList<T extends string>({
  options,
  value,
  onChange,
  close,
}: Props<T>) {
  return (
    <div className="flex flex-col py-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              close?.();
            }}
            className={cn(
              "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent",
              selected ? "text-foreground" : "text-foreground",
            )}
          >
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              {option.sublabel && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {option.sublabel}
                </span>
              )}
            </div>
            {selected && (
              <span className="font-mono text-[11px] text-cosmo">●</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
