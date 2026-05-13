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

## WTC Test data refresh

WTC player boards and team boards are generated from Cricsheet men's Test JSON
and loaded by `index.html` from `data/wtc-test-data.js`.

To refresh it locally:

```bash
bash scripts/update-cricsheet-tests.sh
```

The same command runs weekly via `.github/workflows/update-cricsheet-tests.yml`
at 06:35 UTC every Monday. It commits the regenerated `data/wtc-test-data.js`
file when Cricsheet publishes new or changed Test scorecards.
