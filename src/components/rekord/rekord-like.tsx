import { CosmoRekordPost } from "@/lib/universal/cosmo/rekord";
import { toggleLike } from "./actions";
import { Button } from "../ui/button";
import { LuHeart } from "react-icons/lu";
import { TbLoader2 } from "react-icons/tb";
import { cn, track } from "@/lib/utils";
import { Dispatch, SetStateAction, useTransition } from "react";

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
        track(`${isLiked ? "unlike" : "like"}-rekord`);
        setIsLiked((prev) => !prev);
      }
    });
  }

  return (
    <form
      action={submit}
      className="absolute z-30 top-1 right-0 flex flex-col items-center drop-shadow-sm"
    >
      <input type="text" name="postId" value={post.id} hidden readOnly />
      <input type="checkbox" name="isLiked" checked={isLiked} hidden readOnly />

      <Button type="submit" disabled={isPending} variant="icon">
        {isPending ? (
          <TbLoader2 className="w-8 h-8 animate-spin" />
        ) : (
          <LuHeart
            className={cn(
              "w-8 h-8 drop-shadow-sm",
              isLiked ? "fill-red-500 text-red-500" : "text-foreground"
            )}
          />
        )}
      </Button>

      <span className="text-sm drop-shadow-sm">{post.totalLikeCount}</span>
    </form>
  );
}
