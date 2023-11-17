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
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ChevronRight, Loader2, PlusCircle } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { create } from "./actions";
import { useToast } from "../ui/use-toast";
import { ObjektList } from "@/lib/universal/objekt-index";
import Link from "next/link";
import { Route } from "next";

type Props = {
  lists: ObjektList[];
};

export default function ObjektLists({ lists }: Props) {
  const { toast } = useToast();

  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    startTransition(async () => {
      await create({ name });
      setOpen(false);
      toast({
        description: "Objekt list created!",
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">View Lists</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40 max-h-48">
          <DropdownMenuLabel>Objekt Lists</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {lists.map((list) => (
              <DropdownMenuItem key={list.id} className="text-sm truncate">
                <Link
                  href={`/@Kairu/list/${list.slug}` as Route}
                  className="w-full flex items-center justify-between"
                >
                  {list.name}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DialogTrigger asChild>
            <DropdownMenuItem>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="font-semibold">Create New</span>
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Objekt List</DialogTitle>
          <DialogDescription>
            You can add objekts to the list later.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full flex flex-col gap-1">
          <Label htmlFor="name">Name</Label>
          <Input
            type="text"
            autoComplete="false"
            maxLength={24}
            onInput={(e) => setName(e.currentTarget.value)}
            id="name"
            placeholder="Want To Trade"
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending} onClick={submit}>
            {isPending ? "Saving..." : "Save"}
            {isPending && <Loader2 className="ml-2 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
