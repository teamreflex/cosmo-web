import { CosmoRekordPost } from "@/lib/universal/cosmo/rekord";
import { toggleLike } from "./actions";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "../ui/button";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

type Props = {
  post: CosmoRekordPost;
  isLiked: boolean;
  setIsLiked: Dispatch<SetStateAction<boolean>>;
};

export default function RekordLikeButton({ post, isLiked, setIsLiked }: Props) {
  const [state, formAction] = useFormState(toggleLike, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      setIsLiked((prev) => !prev);
    }
  }, [state, setIsLiked]);

  return (
    <form
      action={formAction}
      className="absolute z-30 top-1 right-0 flex flex-col items-center drop-shadow"
    >
      <input type="text" name="postId" value={post.id} hidden readOnly />
      <input type="checkbox" name="isLiked" checked={isLiked} hidden readOnly />
      <SubmitButton isLiked={isLiked} />

      <span className="text-sm drop-shadow">{post.totalLikeCount}</span>
    </form>
  );
}

function SubmitButton({ isLiked }: { isLiked: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} variant="icon">
      {pending ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <Heart
          className={cn(
            "w-8 h-8 drop-shadow",
            isLiked ? "fill-red-500 text-red-500" : "text-foreground"
          )}
        />
      )}
    </Button>
  );
}
