# proxy

mitmproxy addons that capture objekt media from the COSMO phone app's traffic. It is a developer tool: the addons only download files to disk and never talk to Apollo.

## Install

- Python 3.10+ and [uv](https://docs.astral.sh/uv/getting-started/installation/).
- `uv tool install mitmproxy`. The scripts call `mitmdump`, so it must be on your `PATH` afterwards.

## iOS setup (one-time)

1. Set the phone's Wi-Fi proxy to this machine's IP on port `8080`
2. With proxy active, open Safari and visit `http://mitm.it`
3. Download and install the certificate profile
4. **Settings → General → About → Certificate Trust Settings**: enable the mitmproxy CA

## Usage

```bash
turbo proxy:audio                                  # hasVoice media, as you browse
turbo proxy:motion                                 # Motion media, every artist
turbo proxy:motion -- --set artist=tripleS,artms   # some artists
```

| Addon           | Trigger                                                                                                        | Downloads to               |
| --------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `src/audio.py`  | Passive: each `objekt-summaries` response the app loads while you browse collections                           | `output/audio/<slug>.mp4`  |
| `src/motion.py` | The first request carrying a Bearer token; it then fetches the newest 100 Motion collections per artist itself | `output/motion/<slug>.mp4` |

- `proxy:motion` runs once per proxy process, so restart the proxy to run it again.
- Files already on disk are skipped. `output/` is gitignored.
- The token `proxy:motion` captures is your own COSMO session. It stays in memory and is never written to disk.
- File names come from `src/lib/slugify.py`, which must stay in step with `slugifyObjekt()` in `@apollo/util` so they match collection slugs.
