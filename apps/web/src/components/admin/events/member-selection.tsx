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
import { IconPlus, IconUsers, IconX } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  members: string[];
  value: string[];
  onChange: (members: string[]) => void;
};

export default function MemberSelection({ members, value, onChange }: Props) {
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

  function addCustomMember() {
    const trimmed = customInput.trim();
    if (!trimmed || value.includes(trimmed)) {
      setCustomInput("");
      return;
    }
    onChange([...value, trimmed]);
    setCustomInput("");
    setPopoverOpen(false);
  }

  function handleAddAllMembers() {
    onChange(members);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomMember();
    }
  }

  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>{m.admin_matrix_members()}</FieldLabel>

        <div className="flex items-center gap-2">
          <Button size="xs" onClick={handleAddAllMembers}>
            <IconUsers className="size-3" />
            <span>All</span>
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
            <button type="button" onClick={() => toggleMember(member)}>
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
