# Hughes Collective — website & workspace

Live address (once DNS is set): **https://hughes.pneumaticcounseling.org**

| Part | Address | Who can use it |
|---|---|---|
| Public website | `/` and `/profile.html` | Anyone |
| Private workspace (also installs as a phone app) | `/app/` | Only emails on the invite list |

Built as plain HTML, CSS and JavaScript (no build step). Data, sign-in and live chat run on Supabase
(project `hughes-collective`, Pneumatic org, free plan).

## One-time setup

### 1. DNS (at whoever manages pneumaticcounseling.org)
Add one record. It doesn't touch email.

| Type | Name / Host | Value |
|---|---|---|
| CNAME | `hughes` | `<your-github-username>.github.io` |

Then in the GitHub repo: Settings › Pages › Custom domain = `hughes.pneumaticcounseling.org`, and tick **Enforce HTTPS**
once it's offered (can take up to an hour).

### 2. Supabase sign-in settings (supabase.com › project hughes-collective › Authentication)
- **URL Configuration**
  - Site URL: `https://hughes.pneumaticcounseling.org/app/`
  - Redirect URLs: add `https://hughes.pneumaticcounseling.org/app/`
- **Email confirmations.** Supabase's built-in email only delivers to members of your Supabase organization,
  so your siblings won't get confirmation or password-reset emails until you either:
  - **Quick:** turn off "Confirm email" (Sign In / Providers › Email). Only invited emails can sign up anyway.
  - **Better:** add a custom email sender (SMTP), e.g. a free Resend or Brevo account on your domain.

### 3. Invite your siblings
Sign in at `/app/` with your invited admin email (choose "Create your account" the first time).
Go to **Admin › Invite a sibling**, pick their profile, enter their email, and send them the `/app/` link.

## Privacy & safety built in
- Workspace data is locked to invited members by database rules (row-level security), not just hidden in the page.
- Visitors can read public profiles and send the contact form, nothing else. Login IDs are never exposed.
- Uninvited emails are refused at sign-up by the database itself.
- Each person can edit only their own profile; only admins manage the invite list.
- The workspace isn't for client information or PHI. Keep that in each clinician's own HIPAA-compliant system.

## Free-plan notes
- Supabase pauses free projects after about a week with no activity; restore it from the Supabase dashboard.
- The contact form has no spam filter yet. Add one if spam shows up.

## Files
- `index.html`, `profile.html`: public site · `assets/site.js`: loads profiles, sends the contact form
- `app/`: workspace (`app.js`), install files (`manifest.webmanifest`, `sw.js`, `icons/`)
- `assets/common.js`: database connection (the publishable key is meant to be public) · `assets/vendor/supabase.js`: bundled Supabase client v2.119.0
- `CNAME`: custom domain for GitHub Pages
