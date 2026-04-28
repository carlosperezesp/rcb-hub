# rcb-hub

## IPL data refresh

Player form is generated from Cricsheet ball-by-ball JSON and loaded by `index.html`
from `data/ipl-2026-season-stats.js`.

To refresh it locally:

```bash
bash scripts/update-cricsheet-ipl.sh
```

The same command runs daily via `.github/workflows/update-cricsheet-ipl.yml` and
commits the regenerated `data/ipl-2026-season-stats.js/json` files when Cricsheet
publishes new IPL matches.
