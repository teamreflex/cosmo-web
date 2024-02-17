"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ChevronRight, List, Loader2, PlusCircle } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { create } from "./actions";
import { useToast } from "../ui/use-toast";
import { ObjektList } from "@/lib/universal/objekts";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useFormState, useFormStatus } from "react-dom";
import { FieldError } from "../form/error";

type Props = {
  lists: ObjektList[];
  nickname: string;
  allowCreate: boolean;
};

export default function ListDropdown({ lists, nickname, allowCreate }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [state, formAction] = useFormState(create, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      toast({
        description: "Objekt list created!",
      });
    }
  }, [state.status, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <DropdownMenuTrigger asChild>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full"
                  variant="secondary"
                  size="icon"
                >
                  <List className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
            </DropdownMenuTrigger>
            <TooltipContent side="bottom">Objekt Lists</TooltipContent>
            <DropdownMenuContent>
              <DropdownMenuLabel>Objekt Lists</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {lists.map((list) => (
                  <DropdownMenuItem key={list.id} className="text-sm">
                    <Link
                      href={`/@${nickname}/list/${list.slug}`}
                      className="w-full flex items-center justify-between"
                    >
                      {list.name}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>
                ))}
                {lists.length === 0 && (
                  <DropdownMenuItem className="text-sm">
                    0 lists
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {allowCreate && (
                <DialogTrigger asChild>
                  <DropdownMenuItem className="cursor-pointer">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="font-semibold">Create New</span>
                  </DropdownMenuItem>
                </DialogTrigger>
              )}
            </DropdownMenuContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Objekt List</DialogTitle>
          <DialogDescription>
            You can add objekts to the list later.
          </DialogDescription>
        </DialogHeader>
        <form className="w-full flex flex-col gap-3" action={formAction}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              autoComplete="off"
              maxLength={24}
              id="name"
              name="name"
              placeholder="Want To Trade"
              data-1p-ignore
            />
            <FieldError state={state} field="name" />
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
      {pending && <Loader2 className="ml-2 animate-spin" />}
    </Button>
  );
}
