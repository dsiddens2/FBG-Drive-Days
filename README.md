# Best Driving Roads from Fredericksburg

Curated Hill Country driving roads from Discover Fredericksburg — named loops from town, with a map instead of a mill.

## Local preview

```
python3 bake_drive.py
python3 -m http.server 8770 --directory docs
```

Open http://127.0.0.1:8770/

Catalog lives in `routes.json`. Re-run `bake_drive.py` after editing routes, copy, or `finder.js` / `finder.css`.

Listings cards fetch the shared snapshot at `https://dsiddens2.github.io/FBG-Listings/listings.json`. Do not copy that JSON into this repo. `finder.js` Fisher–Yates shuffles those cards on every page load so the leftmost card is not always the highest-priced listing. **See all listings** still opens the Reata search sorted by list price.


## Live (Squarespace)

GitHub Pages serves CSS, JS, the map library, and the logo:

https://dsiddens2.github.io/FBG-Drive-Days/

1. Create a Squarespace page with slug **Best-Driving-Roads**.
2. Drag it to **Not Linked** so it stays out of the header.
3. Paste the `CODE BLOCK` section from `squarespace-embed.html` into one Code Block.
4. After a bake, paste the new Code Block again (integrity hashes will refuse stale CSS/JS).
