# Private roulette images

USUARIO and OBS use `js/roulette-image-assets.js` to resolve catalog PNG paths to private lossless WebP copies. Public catalogs, original images, and public roulette pages remain unchanged. Unknown paths keep the original PNG; failed WebP loads fall back to that PNG. A missing manifest also leaves PNG rendering available.

Regenerate with `python tests/build-roulette-images.py` (Pillow). The builder checks decoded RGBA equality for every output. Current build: 366 images, 20,906,666 original bytes, 11,841,210 WebP bytes, 43.4% saved. These are whole-catalog totals, not the payload for every spin.

This preserves original detail; it does not invent high-resolution artwork. Killer portraits are 512×512 and perk icons 256×256. Large source upscaling in OBS can still look soft. The public framing and animation are unchanged.

Perk animation uses a 2× backing canvas, high-quality smoothing, and decoded images resolved before the animation loop. Rendering no longer schedules promise callbacks per visible image per frame. Repeated URLs share the decoded-image cache. Failed preload attempts are retryable and bounded at 15 seconds. The existing killer timing and nonblocking preparation remain unchanged.

Validation: `tests/roulette-image-quality.cjs` covers deduplicated requests, 2× canvases at devicePixelRatio 1, a full four-slot spin, painted final pixels, no new portrait requests during a warm spin, and PNG fallback. Existing `killer-visibility.cjs`, `killer-obs-parity.cjs`, and `cartas.cjs` cover animation visibility, sequencing, responsive geometry, and private card rules. These browser checks do not guarantee a particular FPS while the user's game and OBS encoder run.
