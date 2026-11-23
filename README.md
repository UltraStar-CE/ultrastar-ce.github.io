# USCE website

GitHub Pages serves the static files in `docs/` from `main`. The site has no build step, package dependencies, or external asset requests.

- Edit About, Contact and Development in their corresponding `docs/**/index.html` files.
- Shared navigation, colors and responsive styles are in `docs/site.css`.
- Update the Themes browser using the export tool in `tools/`.

To preview locally, run `python -m http.server 8000 --directory docs` from this repository.


## Refreshing theme screenshots

With Pillow installed, point the exporter at a screenshot directory containing
`capture-manifest.json`. It takes the public screenshots and filter metadata
from the manifest and creates optimized WebP images for the site.

```text
python tools/export-gallery.py <path-to-screenshot-gallery> docs/themes --prune
```

Review the new images before publishing. Keep diagnostics and local-path dialogs
out of the public gallery. The browser uses the generated `gallery-data.js`
inventory and needs no external service.
