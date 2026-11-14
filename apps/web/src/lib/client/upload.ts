/**
 * Sends a file straight to storage through the presigned URL `getUrl` asks
 * the server for, and returns the URL the file is served from. The file goes
 * up under its own content type, which is the type `getUrl` must sign for.
 */
export async function uploadToPresignedUrl(
  getUrl: () => Promise<{ uploadUrl: string; publicUrl: string }>,
  file: File,
) {
  const { uploadUrl, publicUrl } = await getUrl();

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return publicUrl;
}
