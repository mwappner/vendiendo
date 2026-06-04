# Static Second-Hand Catalog

A simple static one-page catalog for second-hand items. Product data lives in
plain text files and images inside `content/products/`, and the browser reads a
generated `content/products.json` manifest.

## Edit Content

- `content/landing.txt` controls the opening message.
- `content/contact.txt` controls the contact information shown in the catalog.
- Add one `.txt` file per product inside `content/products/`.
- Product text files use five lines: name or description, notes, price,
  dimensions, and status. Price can contain multiple lines if needed.
- Product images use the same stem as the product text file, such as
  `baul.jpeg`, `catre_1.jpeg`, and `catre_2.jpeg`.

Supported image formats are `.png`, `.jpg`, `.jpeg`, and `.webp`.

## Build The Manifest

Run this whenever products or images change:

```bash
python build_manifest.py
```

If your machine does not provide `python`, use `python3` for the same commands.

This writes `content/products.json`, which should be committed because GitHub
Pages serves static files and does not run Python scripts.

## Test Locally

```bash
python serve_local.py
```

Then open `http://localhost:8000`. The local server rebuilds the manifest first
so the catalog is fresh.

## Deploy To GitHub Pages

1. Create a GitHub repository.
2. Put all files in the repository.
3. Run:

```bash
python build_manifest.py
```

4. Commit and push:

```bash
git add .
git commit -m "Initial catalog site"
git push
```

5. In GitHub, go to `Settings > Pages`.
6. Set the source to deploy from the main branch, root folder.
7. Use the generated GitHub Pages URL.
