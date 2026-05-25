import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import {
  IconArrowsShuffle,
  IconPlus,
  IconRefresh,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  members: string[];
  value: string[];
  onChange: (members: string[]) => void;
  memberAliases?: Record<string, string>;
  disableUnits?: boolean;
};

export default function MemberSelection({
  members,
  value,
  onChange,
  memberAliases,
  disableUnits,
}: Props) {
  const [customInput, setCustomInput] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Custom members are any selected values not in the original members list
  const customMembers = value.filter((v) => !members.includes(v));

  function toggleMember(memberName: string) {
    const isSelected = value.includes(memberName);
    onChange(
      isSelected
        ? value.filter((m) => m !== memberName)
        : [...value, memberName],
    );
  }

  function addCustomMembers(inputs: string[]) {
    const seen = new Set(value);
    const additions: string[] = [];
    for (const input of inputs) {
      const trimmed = input.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      additions.push(trimmed);
    }
    setCustomInput("");
    if (additions.length === 0) return;
    onChange([...value, ...additions]);
    setPopoverOpen(false);
  }

  function handleAddAllMembers() {
    onChange(members);
  }

  function handleReset() {
    onChange([]);
  }

  function handleAddUnits() {
    if (!memberAliases) return;
    const pairs: string[] = [];
    for (const [i, memberA] of members.entries()) {
      for (const memberB of members.slice(i + 1)) {
        const a = memberAliases[memberA];
        const b = memberAliases[memberB];
        if (a && b) pairs.push(`${a} x ${b}`);
      }
    }
    onChange(pairs);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomMembers([customInput]);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!/\r?\n/.test(text)) return;
    e.preventDefault();
    addCustomMembers(text.split(/\r?\n/));
  }

  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>{m.admin_matrix_members()}</FieldLabel>

        <div className="flex items-center gap-2">
          <Button size="xs" onClick={handleReset}>
            <IconRefresh className="size-3" />
          </Button>

          <Button size="xs" onClick={handleAddAllMembers}>
            <IconUsers className="size-3" />
            <span>All</span>
          </Button>

          <Button size="xs" onClick={handleAddUnits} disabled={disableUnits}>
            <IconArrowsShuffle className="size-3" />
            <span>Units</span>
          </Button>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="xs">
                <IconPlus className="size-3" />
                <span>Custom</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <Input
                placeholder={m.admin_matrix_custom_member_placeholder()}
                value={customInput}
                onChange={(e) => setCustomInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <Badge
            key={member}
            variant="outline"
            className={cn(
              "cursor-pointer",
              value.includes(member) &&
                "border-foreground bg-foreground text-background",
            )}
            asChild
          >
            <button
              type="button"
              onClick={() => toggleMember(member)}
              aria-pressed={value.includes(member)}
            >
              {member}
            </button>
          </Badge>
        ))}
        {customMembers.map((member) => (
          <Badge
            key={`custom-${member}`}
            variant="secondary"
            className="cursor-pointer gap-1 border-foreground bg-foreground text-background"
            onClick={() => toggleMember(member)}
          >
            {member}
            <IconX className="size-3" />
          </Badge>
        ))}
      </div>
    </Field>
  );
}
