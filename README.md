# nmbli.com

Static landing page for the Nmbli pilot plus assets to publish an MTA-STS policy on `mta-sts.nmbli.com`.

## Project layout

- `index.html`: Landing page for `https://nmbli.com`
- `CNAME`: Binds the GitHub Pages deployment to the apex domain `nmbli.com`
- `.github/workflows/deploy.yml`: GitHub Actions workflow that publishes the site automatically
after each push to `main`
- `mta-sts/.well-known/mta-sts.txt`: Policy file for the dedicated MTA-STS host
- `mta-sts/CNAME`: Convenience file to reuse when publishing the policy folder as its own GitHub Pages site

## Waitlist form

The waitlist form posts to whatever URL you place in the `data-endpoint` attribute on the
`<form id="waitlist-form">` element. The template ships with a placeholder value
(`https://formspree.io/f/{your-form-id}`) so submissions are blocked until you connect your own
service (Formspree, Getform, Google Apps Script, Zapier, etc.). Steps:

1. Create a form endpoint with your provider of choice and copy the POST URL.
2. Update the `data-endpoint` attribute in `index.html` to the new URL.
3. If the provider requires additional hidden fields or headers, add them to the form and adjust the
   fetch call in the inline script.
4. Test in production—successful submissions return a green confirmation banner; failures surface in
   the inline status message and the console.

## Deploying to GitHub Pages

### Landing page (`nmbli.com`)

1. Push this repository to GitHub and keep the default branch named `main`.
2. In the repository settings ▸ **Pages**, choose **GitHub Actions** as the source. The included
   workflow (`deploy.yml`) will build a tiny `publish/` folder and push it to Pages on every change to `main`.
3. Still in the Pages settings, set the custom domain to `nmbli.com`. GitHub will confirm the `CNAME`
   file in the repo and issue TLS once DNS is in place.
4. In GoDaddy, configure the apex A records to GitHub’s Pages IPs (`185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153`). If you also want `www.nmbli.com`, add a CNAME pointing to
   `<your-username>.github.io`.
5. Allow DNS to propagate, then verify HTTPS in the Pages dashboard.

### MTA-STS host (`mta-sts.nmbli.com`)

GitHub Pages supports a single custom domain per repository, so publish the policy from a tiny
second repo. One way to do it:

1. Create a new repository (for example `mta-sts.nmbli.com`) that contains the files from this repo’s
   `mta-sts` directory (`/.well-known/mta-sts.txt` and the provided `CNAME`). No build step is required.
2. Enable GitHub Pages for that repo using the **main** branch and root directory, then set the custom
   domain to `mta-sts.nmbli.com`.
3. In GoDaddy add a `CNAME` record: `mta-sts` → `<your-username>.github.io` (GitHub will show the
   exact target). Wait for DNS to update so GitHub can issue the certificate.
4. Keep the existing `_mta-sts` TXT record: `v=STSv1; id=20251014`. Increment the `id` whenever the policy file changes.

## Updating the policy

- Edit `mta-sts/.well-known/mta-sts.txt`, copy the changes into the dedicated policy repo, and push.
- Bump the `_mta-sts` TXT record `id` value in DNS.
- Use [Google's MTA-STS validator](https://toolbox.googleapps.com/apps/checkmx/) or [Hardenize](https://www.hardenize.com/) to confirm the new policy is reachable.

## Local preview

Because the assets are static, you can open `index.html` or `mta-sts/.well-known/mta-sts.txt` directly
in a browser, or run a simple HTTP server such as `python3 -m http.server` from the repository root if
you prefer to mimic production paths.
