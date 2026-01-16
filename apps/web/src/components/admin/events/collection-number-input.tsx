import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  value: string[];
  onChange: (numbers: string[]) => void;
};

const COLLECTION_NUMBER_PATTERN = /^\d{3}[za]$/i;

export default function CollectionNumberInput({ value, onChange }: Props) {
  const [input, setInput] = useState("");

  function addNumber() {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!COLLECTION_NUMBER_PATTERN.test(trimmed)) {
      toast.error(m.admin_matrix_invalid_number());
      return;
    }

    const normalized = trimmed.toLowerCase();
    if (value.includes(normalized)) {
      setInput("");
      return;
    }

    onChange([...value, normalized]);
    setInput("");
  }

  function removeNumber(number: string) {
    onChange(value.filter((n) => n !== number));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addNumber();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={m.admin_matrix_collection_number_placeholder()}
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onBlur={addNumber}
        className="w-24"
      />
      {value.map((number) => (
        <Badge
          key={number}
          className="cursor-pointer gap-1"
          onClick={() => removeNumber(number)}
        >
          {number.toUpperCase()}
          <IconX className="size-3" />
        </Badge>
      ))}
    </div>
  );
}
