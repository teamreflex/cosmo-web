import { useBinderEditor } from "@/hooks/use-binder-editor";
import { useMediaQuery } from "@/hooks/use-media-query";
import { binderQuery, binderShelfQuery } from "@/lib/queries/binders";
import type { BinderDetail } from "@/lib/universal/binders";
import type { Binder } from "@apollo/database/web/types";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import BinderEditorDesktop from "./binder-editor-desktop";
import BinderEditorPhone from "./binder-editor-phone";
import BinderSettingsDialog from "./binder-settings-dialog";
import { DeleteBinderDialog, RemovePageDialog } from "./editor-dialogs";

type Props = {
  binder: BinderDetail;
  owner: {
    userId: string;
    /** the identifier the profile routes under */
    username: string;
    address: string;
    lockedTokenIds: ReadonlySet<number>;
  };
};

/**
 * The owner's binder editor: a split view on desktop and a page with a picker
 * sheet on a phone, sharing one editing model and the header dialogs.
 */
export default function BinderEditor({ binder, owner }: Props) {
  const isDesktop = useMediaQuery();
  const editor = useBinderEditor({ binder, userId: owner.userId });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<
    "settings" | "delete" | "remove-page" | null
  >(null);

  const rootRef = useRef<HTMLDivElement>(null);

  // the editor owns the screen, so it opens scrolled to the tab strip
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start" });
  }, [binder.id]);

  const lastPageCount = binder.entries.filter(
    (entry) => entry.page === binder.pageCount - 1,
  ).length;

  function closeDialog(open: boolean) {
    if (!open) setDialog(null);
  }

  /**
   * A rename changes the slug, and with it the route and the binder's cache
   * key, so the saved binder is seeded under the new key before moving there.
   */
  function handleSaved(row: Binder) {
    queryClient.setQueryData(
      binderQuery(owner.userId, row.slug).queryKey,
      (current) => ({ ...(current ?? binder), ...row }),
    );
    void queryClient.invalidateQueries({
      queryKey: binderShelfQuery(owner.userId).queryKey,
    });
    if (row.slug !== binder.slug) {
      void navigate({
        to: "/@{$username}/binder/$slug",
        params: { username: owner.username, slug: row.slug },
        replace: true,
      });
    }
  }

  async function handleDeleted() {
    void queryClient.invalidateQueries({
      queryKey: binderShelfQuery(owner.userId).queryKey,
    });
    await navigate({
      to: "/@{$username}",
      params: { username: owner.username },
    });
    // dropped once the editor has unmounted, so it can't refetch the binder
    queryClient.removeQueries({
      queryKey: binderQuery(owner.userId, binder.slug).queryKey,
    });
  }

  const Layout = isDesktop ? BinderEditorDesktop : BinderEditorPhone;

  return (
    <div ref={rootRef} className="scroll-mt-14 md:scroll-mt-30">
      <Layout
        editor={editor}
        username={owner.username}
        address={owner.address}
        lockedTokenIds={owner.lockedTokenIds}
        onEdit={() => setDialog("settings")}
        onDelete={() => setDialog("delete")}
        onRemoveLastPage={() => {
          if (lastPageCount > 0) setDialog("remove-page");
          else editor.removeLastPage();
        }}
      />

      <BinderSettingsDialog
        binder={binder}
        open={dialog === "settings"}
        onOpenChange={closeDialog}
        onSaved={handleSaved}
      />
      <DeleteBinderDialog
        binderId={binder.id}
        name={binder.name}
        open={dialog === "delete"}
        onOpenChange={closeDialog}
        onDeleted={() => void handleDeleted()}
      />
      <RemovePageDialog
        page={binder.pageCount}
        objektCount={lastPageCount}
        open={dialog === "remove-page"}
        onOpenChange={closeDialog}
        onConfirm={() => editor.removeLastPage()}
      />
    </div>
  );
}
