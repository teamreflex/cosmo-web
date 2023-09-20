import { object, string } from "zod";
import { search } from "@/lib/server/cosmo";

const userSearchSchema = object({
  search: string().min(3),
});

export async function searchForUser(form: FormData) {
  const result = userSearchSchema.safeParse({
    search: form.get("search"),
  });

  if (!result.success) {
    return { success: false, error: "Must be at least 3 characters" };
  }

  const searchResults = await search(result.data.search);

  return { success: true, users: searchResults };
}
