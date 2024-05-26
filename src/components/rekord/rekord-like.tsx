import { CosmoRekordPost } from "@/lib/universal/cosmo/rekord";
import { toggleLike } from "./actions";
import { Button } from "../ui/button";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction, useTransition } from "react";
import { trackEvent } from "fathom-client";

type Props = {
  post: CosmoRekordPost;
  isLiked: boolean;
  setIsLiked: Dispatch<SetStateAction<boolean>>;
};

export default function RekordLikeButton({ post, isLiked, setIsLiked }: Props) {
  const [isPending, startTransition] = useTransition();

  function submit(form: FormData) {
    startTransition(async () => {
      const result = await toggleLike(form);
      if (result.status === "success" && result.data) {
        trackEvent(`${isLiked ? "unlike" : "like"}-rekord`);
        setIsLiked((prev) => !prev);
      }
    });
  }

  return (
    <form
      action={submit}
      className="absolute z-30 top-1 right-0 flex flex-col items-center drop-shadow"
    >
      <input type="text" name="postId" value={post.id} hidden readOnly />
      <input type="checkbox" name="isLiked" checked={isLiked} hidden readOnly />

      <Button type="submit" disabled={isPending} variant="icon">
        {isPending ? (
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

      <span className="text-sm drop-shadow">{post.totalLikeCount}</span>
    </form>
  );
}
