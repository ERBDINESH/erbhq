# ERB HQ — erbhq.com

Source for the ERB informational website. This repository is a **plain HTML/CSS/JavaScript** site; no npm, MacBook, build step, API keys, or paid hosting are needed to edit and preview locally.

## Folder layout

```text
site/
  index.html            Home, services, products, about, contact
  privacy/index.html    Website-only privacy notice
  terms/index.html      Website-only terms of use
  assets/               CSS, JS and favicon
  404.html              Not-found page
  robots.txt
  sitemap.xml
tests/test_site.py       Lightweight static checks
```

## Run locally on Windows (PowerShell)

From the repository root:

```powershell
py -m http.server 8000 --directory site
```

Open `http://localhost:8000/`, `/privacy/`, and `/terms/` in your browser. Press `Ctrl+C` to stop. If `py` is unavailable, install Python or use `python -m http.server 8000 --directory site`.

Optional checks:

```powershell
py -m unittest discover -s tests -v
```

## Put these files into the existing GitHub repository

The existing repository is https://github.com/ERBDINESH/erbhq and initially contains a small README. **Do not initialise a second unrelated Git history.**

1. Clone it on your own Windows laptop (Git installed):

   ```powershell
   git clone https://github.com/ERBDINESH/erbhq.git
   cd erbhq
   ```

2. Extract the supplied `erbhq-local.zip` to another folder, and **copy the `site`, `tests`, `.gitignore`, and `README.md` from its `erbhq-local` folder** into the newly cloned `erbhq` folder. Replace the existing README. Do not copy an outer ZIP folder inside the repo and do not copy an existing `.git` folder.

3. Run the local preview and check content before pushing. Then:

   ```powershell
   git status
   git add README.md .gitignore site tests
   git commit -m "Add ERB HQ static site and local development setup"
   git push -u origin main
   ```

   GitHub may prompt for sign-in. Do **not** paste credentials or tokens into this site or chat.

## Git-based deployment: Cloudflare Pages

The current live site was previously published with Pages **Direct Upload**. Cloudflare does not support converting that existing Pages project into a Git-integrated project. **Keep it live while setting up a separate Git-connected Pages project.**

1. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git. Authorize GitHub and select `ERBDINESH/erbhq`.
2. Use a distinct project name such as `erbhq-git` (if available); production branch `main`.
3. Framework preset: **None**. Root directory: repository root (`/`, or leave the advanced root field empty). Build command: leave blank; if the UI requires a command, use `exit 0`. Build output directory: **`site`**. Do not set it to the repository root.
4. Save and Deploy. Check the new `*.pages.dev` URL, including `/privacy/`, `/terms/`, phone layout, working contact link and product URLs. Every future push to `main` can trigger a new production deployment after Git integration is enabled.
5. **Only after checks:** move `erbhq.com` from the old Direct Upload Pages project to this new project. Review the old apex CNAME in Cloudflare DNS, detach the old project's custom domain following Cloudflare's documented instructions, and add `erbhq.com` via the **new project's Custom domains** UI. Follow Cloudflare's proposed DNS changes. There may be temporary downtime; do not delete the old project until the new domain works and HTTPS is active. Do not delete MX/TXT email records.

Official docs:
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/configuration/custom-domains/

## Publish checks (not automated)

- Verify `https://erbdinesh.com/#connect` is a **working enquiry channel** you monitor. If not, replace it with a real, tested contact method consistently on home, privacy and terms pages.
- Confirm LaunchProof link, Thirumalaiyar development status, and service descriptions are accurate.
- Check Cloudflare account analytics, email routing and other third-party tools. The privacy notice describes source-code features only and may need changes to match your actual setup. Have privacy/terms reviewed for applicable requirements.
- ERB is presented as an individual initiative, **not an incorporated company**; registration status is not implied. Check relevant name/trademark issues before representing exclusivity.
- **Employment note:** Your current agreement's Clause 6 restricts other paid or unpaid work. Website publishing/soliciting work may raise employment questions; postponing business registration does not remove that risk. Do not accept outside work on the assumption that this website authorizes it. Get appropriate advice or written clarification; never use employer/client time, devices, code, or confidential information.

This local project package is not itself a deployment and has not been pushed to GitHub.
