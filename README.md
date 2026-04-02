# College Memories — The Archive

Static gallery site: HTML, plain CSS, vanilla JavaScript. Gallery data lives in [`data/metadata.json`](data/metadata.json) (separate from [`assets/`](assets/)).

## GitHub Pages

1. Push this repository to GitHub.
2. Open the repo on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose your publishing branch (e.g. `main`) and folder **`/ (root)`**, then save.

The site will be available at `https://<user>.github.io/<repo>/` (project site) or `https://<user>.github.io/` if the repo is `<user>.github.io`.

**Note:** The empty [`.nojekyll`](.nojekyll) file disables Jekyll processing so all files (including `data/`) are served as static assets.

Serve locally with any static HTTP server (required for `fetch`):

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.
