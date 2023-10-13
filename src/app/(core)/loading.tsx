import { Loader } from "@/components/loader";
import { env } from "@/env.mjs";

export default async function HomeLoading() {
  return <Loader>Loading {env.NEXT_PUBLIC_APP_NAME}...</Loader>;
}
