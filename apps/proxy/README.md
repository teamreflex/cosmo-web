# proxy

mitmproxy addons for intercepting COSMO app traffic.

## Requirements

- Python 3.10+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

## Install

```bash
uv tool install mitmproxy
```

## iOS setup (one-time)

1. Set the phone's Wi-Fi proxy to this machine's IP on port `8080`
2. With proxy active, open Safari and visit `http://mitm.it`
3. Download and install the certificate profile
4. **Settings → General → About → Certificate Trust Settings** — enable the mitmproxy CA

## Usage

```bash
turbo proxy:audio                                  # download frontMedia for hasVoice collections
turbo proxy:motion                                 # fetch Motion media for all artists
turbo proxy:motion -- --set artist=tripleS         # single artist
turbo proxy:motion -- --set artist=tripleS,artms   # multiple artists
```

Downloaded files are written to `output/audio/` and `output/motion/`.
