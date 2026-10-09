import { fetchCosmoLinkHistory } from "@/lib/server/cosmo-link-history.server";
import { staffMiddleware } from "@/lib/server/middlewares";
import { COSMO_TRANSFER_PERMISSIONS } from "@/lib/universal/cosmo-transfer";
import { cosmoLinkHistoryQuerySchema } from "@/lib/universal/schema/cosmo-link-history";
import { createServerFn } from "@tanstack/react-start";

/**
 * One page of the COSMO link history, optionally narrowed by a search.
 */
export const $fetchCosmoLinkHistory = createServerFn({ method: "GET" })
  .middleware([staffMiddleware(COSMO_TRANSFER_PERMISSIONS)])
  .validator(cosmoLinkHistoryQuerySchema)
  .handler(({ data }) => fetchCosmoLinkHistory(data));
