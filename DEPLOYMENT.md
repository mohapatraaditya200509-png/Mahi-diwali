# DEPLOYMENT — Publish the surprise (free, GitHub Pages)

Goal: a public HTTPS link like `https://<your-username>.github.io/<repo>/` that anyone
can open — no login, no password, works on phones, shareable on WhatsApp.

Everything in this project uses **relative paths** (`style.css`, `script.js`,
`assets/music/…`), so it works as-is on GitHub Pages under a sub-path. No domain, no
paid service, no build step.

> **Note:** there are no GitHub credentials on the machine this project was built on,
> so nothing has been published yet. Follow the steps below — it takes about 5 minutes.

---

## What you need

- A free GitHub account (create one at <https://github.com/signup> if you don't have one)
- The `mahi-diwali` folder (this project) on your computer
- That's it

---

## Method A — easiest: upload through the GitHub website

### 1. Create the repository

1. Sign in to GitHub → click the **+** (top-right) → **New repository**
2. Repository name: `mahi-diwali` (or any name you like)
3. Choose **Public** (required for free GitHub Pages)
4. **Do not** tick "Add a README" (you are uploading your own files)
5. Click **Create repository**

### 2. Upload the files

1. On the empty repo page click **uploading an existing file**
   (or **Add file → Upload files**)
2. Drag the *contents* of the `mahi-diwali` folder into the upload area
   (i.e. `index.html`, `style.css`, `script.js`, `README.md`, `DEPLOYMENT.md`,
   and the `assets` folder — **not** the outer folder itself)
3. Wait for all files to finish uploading
4. Commit message: `A Diwali surprise for Mahi ❤️`
5. Click **Commit changes**

Result: `index.html` must sit at the **root** of the repository
(…/mahi-diwali/index.html), not inside a subfolder.

### 3. Enable GitHub Pages

1. Repo page → **Settings** (tab) → **Pages** (left sidebar, under "Code and automation")
2. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **`main`** (or `master`) / **`/ (root)`**
3. Click **Save**
4. Wait ~1 minute, refresh the Settings → Pages tab — the site URL appears at the top:
   `https://<your-username>.github.io/mahi-diwali/`

---

## Method B — command line (if you have git)

```bash
cd mahi-diwali
git init
git add .
git commit -m "A Diwali surprise for Mahi ❤️"
git branch -M main
git remote add origin https://github.com/<your-username>/mahi-diwali.git
git push -u origin main
```

Then open the repo on GitHub → **Settings → Pages** → Source: **Deploy from a branch** →
branch **`main` / (root)** → **Save**.

---

## 4. Verify the public link (important — do this before sending)

1. Wait for the green "Your site is live" on Settings → Pages
   (first deploy can take 1–3 minutes)
2. Open the URL in a **private/incognito** window — it must load with no sign-in
3. Confirm on your phone: open the link in Chrome/Safari →
   - the diya scene appears
   - **START EXPERIENCE** starts the music
   - all five scenes play, **Replay** restarts it
4. Optional deeper check from a terminal:

```bash
curl -sI https://<your-username>.github.io/mahi-diwali/ | head -1   # HTTP/1.1 200
curl -sI https://<your-username>.github.io/mahi-diwali/style.css | head -1
```

If any asset 404s, re-check that every file/folder was uploaded and that
`index.html` is at the repo root.

---

## 5. Send it to Mahi on WhatsApp

1. Copy the verified public URL
2. Open WhatsApp → her chat → paste the link
3. Send! WhatsApp shows a small preview; on her phone one tap opens the surprise
   (best experienced with sound on)

Suggested message:

> This is for you 🌙 Happy Diwali Mahi ❤️ — open with sound on ❤️

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| 404 on the site | Pages not enabled, or wrong branch/folder selected in Settings → Pages, or `index.html` is inside a subfolder |
| Site loads but no music | Confirm `assets/music/diwali-piano.mp3` uploaded (it's ~770 KB, easy to miss) — the site still works silently without it |
| Old version showing | GitHub Pages caches a few minutes; hard-refresh (Ctrl+Shift+R / long-press refresh on phones) |
| Blank page | Browser console (desktop) will say which file 404'd — re-upload that file |
| Repo must be public | Free GitHub Pages requires a public repo (or a free Pro account for private Pages) |

## Security notes

- Never commit or paste GitHub tokens, passwords or credentials into this repository
- The site contains no private data, no login, no analytics, no external requests
- The only personal content is the names in `index.html` (Mahi, Aditya)

---

**Made with love by Aditya ❤️**
