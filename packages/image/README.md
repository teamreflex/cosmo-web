# @apollo/image

Mirrors COSMO objekt images into our R2 bucket: the untouched source bytes for archival, a full-size WebP, and resized WebP renditions for small surfaces. Served from `cdn.apollo.cafe`, and locally from the `s3proxy` service in `docker-compose.yml`.

| Entry                   | Contents                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `@apollo/image`         | Size table, `ObjektImageRef`, key and URL builders. No Bun APIs; safe in the client. |
| `@apollo/image/server`  | URL normalisation, version hashing, download, render, upload, mirror.                |
| `@apollo/image/runtime` | `runImage(effect, signal?)` for callers without an Effect runtime.                   |
| `@apollo/image/errors`  | `ImageFetchError`, `ImageProcessError`, `ImageStoreError`, `isSourceFailure`.        |

## Layout

```
objekts/{front,back}/<slug>/<version>/
    raw.<ext>        COSMO's bytes, untouched
    original.webp    full size; a copy if the source is WebP
    grid.webp        1200w, never upscaled    fronts only
    thumbnail.webp   600w                     fronts only
    xs.webp          300w                     fronts only
```

- `<version>` is the first 12 hex characters of a SHA-256 of the normalised source URL.
- COSMO gives a replaced image a new URL, so a replacement lands in a new folder and every key is immutable.
- The indexer, the web admin and the backfill script each derive the version on their own, so changing `normaliseSourceUrl()`, the hash length or the layout needs a full re-mirror.

## Callers

```
apps/indexer                  apps/web staff                turbo image:mirror
mirrorImages()                $recacheCollectionImages      scripts/mirror.ts
skips a matching version,     front + back, force: true     every collection,
4 at a time, 60s abort each                                 --concurrency (default 8)
      |                             |                             |
      +-----------------------------+-----------------------------+
                                    |
                                    v
              mirrorObjektImage(bucket, { side, slug, sourceUrl, force? })
                                    |
                                    v
              version -> collection.front_image_version / back_image_version
              web: objektImageUrl(VITE_CDN_URL, ref, size); null version = COSMO's URL

failure -> isSourceFailure(error)?
  yes (4xx source, undecodable)            no (timeout, network, 5xx, R2)
  indexer: cooldown on that image          indexer: breaker on all mirroring
  web: ExpectedError                       web: rethrown to Sentry
  script: listed, exit code 1              script: listed, exit code 1
```

The indexer's cooldown, breaker and version write are in [`apps/indexer/CLAUDE.md`](../../apps/indexer/CLAUDE.md#image-mirroring).

## `mirrorObjektImage`

```
mirrorObjektImage(bucket, { side, slug, sourceUrl, force? })
|
+- normaliseSourceUrl   imagedelivery.net/<id>/{3x,4x,...} -> /<id>/original
|                       any other host passes through unchanged
+- objektImageRef       version = sha256(normalised URL)[0..12]
|
+- force? -- no --> HEAD marker (xs.webp, or original.webp for backs)
|                     +- 200 -------------------------------> return version
|                     +- other -----------------------------> ImageStoreError
|                     +- 404 -+
|  yes ----------------------+
|                             v
+- fetchObjektImageSource   GET normalised URL, no Accept header
|                           (a browser Accept makes the source host answer with AVIF)
|
+- renderObjektImage        format read from the bytes, not the URL or Content-Type
|    raw.<ext>          <-- source bytes
|    original.webp      <-- source bytes if WebP, else encode q90
|    grid.webp          <-- source -> 1200w q80
|    thumbnail.webp     <-- grid -> 600w q80   (from grid, so the full-size
|    xs.webp            <-- grid -> 300w q80    source is only resized once)
|
+- uploadObjektImageFiles   PUT each file in that order, one at a time
|                           marker last: its presence means every file landed
|
+-> return version          caller stores it in front/back_image_version
```

- `bucket` is a Bun `S3Client` the caller configures; it only signs URLs.
- Every request goes through one `HttpClient`, including R2, which is reached via presigned URLs because `S3Client.write()` takes no abort signal.
- Each attempt times out after 30s. Network errors and transient statuses are retried twice with backoff.
- Interrupting the effect aborts the in-flight request.
- A failure partway through leaves the marker missing, so the next call redoes everything.
- The output depends only on the source URL, so rewriting is safe even where the CDN has already cached a file.

## Failures

| Error               | When                                                                   | Meaning for callers                       |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `ImageFetchError`   | Download failed. `status` is undefined for network errors or timeouts. | 4xx: broken source. Otherwise: transient. |
| `ImageProcessError` | Bun.Image couldn't decode or encode the source                         | Broken source                             |
| `ImageStoreError`   | R2 request failed                                                      | Transient                                 |

`isSourceFailure(error)` implements the split in the last column. `bun test` covers it, `normaliseSourceUrl` and `objektImageRef` (`tests/server.test.ts`).

## Mirroring a whole environment

`turbo image:mirror` fills the bucket for a new environment. It mirrors the front and back image of every collection in the indexer database, then saves each version to `front_image_version`/`back_image_version` where it changed.

- It reads `INDEXER_DATABASE_URL`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY` and `R2_SECRET_KEY` from the root `.env` and `.env.local`. Check they point at s3proxy before running it.
- Images whose marker is already in the bucket are skipped, so a re-run resumes and retries failures. A run over a complete bucket takes seconds.
- A version is only saved while the row still has the source URL it mirrored, so an image the indexer replaced mid-run keeps the indexer's version.
- Options go after `--`, e.g. `turbo image:mirror -- --concurrency 16 --limit 20`.
- Run it before the Typesense importer's first import. Typesense documents keep the image versions they were imported with and the importer only picks up new collections, so search results would show COSMO's images for anything mirrored later.
