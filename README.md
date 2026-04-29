# rcb-hub

## IPL data refresh

Player form is generated from Cricsheet ball-by-ball JSON and loaded by `index.html`
from `data/ipl-2026-season-stats.js`.

To refresh it locally:

```bash
bash scripts/update-cricsheet-ipl.sh
```

The same command runs twice daily via `.github/workflows/update-cricsheet-ipl.yml`
at 05:20 and 14:20 UTC, which is 07:20 and 16:20 in Amsterdam during CEST. It
commits the regenerated `data/ipl-2026-season-stats.js/json` files when
Cricsheet publishes new IPL matches.
