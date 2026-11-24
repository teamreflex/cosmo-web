import type { ListingSlip } from "@/lib/universal/trade-listings";
import { Drawer } from "@base-ui/react/drawer";
import { PreviewCard } from "@base-ui/react/preview-card";

/**
 * One preview card and one drawer serve every row of a list of listings:
 * a row opens them with its listing as the payload, and the list mounts
 * ListingPreviews once.
 */
export const listingPreviewCard = PreviewCard.createHandle<ListingSlip>();
export const listingDetailsDrawer = Drawer.createHandle<ListingSlip>();
