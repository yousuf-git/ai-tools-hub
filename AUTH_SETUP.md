# Authentication Setup — AI Forge

This app uses **Appwrite** for authentication with a secure server-side (SSR)
session model on **Next.js 16 (App Router)**. It supports:

- Email / password **sign up**, **sign in**, **sign out**
- **Google OAuth 2.0** sign in
- **Email confirmation** (verification link)
- **Forgot password** → emailed reset link → **set new password**
- **Change password** from the account page
- **Remember me for 30 days** toggle
- Route protection via `proxy.ts` + server-side session validation

Sessions are stored in a hardened **httpOnly, Secure, SameSite=Lax** cookie —
never exposed to client JavaScript. All auth logic runs in Server Actions
(`lib/appwrite/auth.ts`); the API key never reaches the browser.

> Do everything in **Part 1–4** before running the app. Part 5 (email templates)
> and Part 6 (custom SMTP) are required for the email flows to actually deliver.

---

## Part 0 — Prerequisites

- Node.js **20.9+** (Next.js 16 requirement)
- An **Appwrite Cloud** account (<https://cloud.appwrite.io>) — or a self-hosted
  Appwrite ≥ 1.6 instance
- A **Google Cloud** account for OAuth

---

## Part 1 — Appwrite project

1. **Create a project**
   Appwrite Console → **Create project**. Pick a region (e.g. Frankfurt).
   After creation, note:
   - **Project ID** → Console → *Project Settings* → *Project ID*
   - **API Endpoint** → shown on the same page, of the form
     `https://<REGION>.cloud.appwrite.io/v1` (e.g. `https://fra.cloud.appwrite.io/v1`).
     Self-hosted uses your own domain.

2. **Register a Web platform** (required — Appwrite only allows OAuth / email
   redirect URLs whose host is a registered platform)
   Console → *Overview* → **Add platform** → **Web app**. Add one entry per host:
   - Name: `Local` — Hostname: `localhost`
   - Name: `Production` — Hostname: `your-domain.com` (e.g. `toolshub.yousuf-dev.com`)

3. **Enable the Email/Password auth method**
   Console → **Auth** → *Settings* (or *Security*) → ensure **Email/Password**
   is **enabled**.

4. **Harden auth security** (Console → **Auth** → *Security*)
   - **Personal data** check: **ON** (blocks passwords containing name/email)
   - **Password dictionary**: **ON** (blocks common breached passwords)
   - **Password history**: set to `5` (prevents reuse)
   - **Session length**: default `365 days` is fine — the browser cookie is what
     enforces "remember me" (30 days) vs. session-only in this app.
   - **Session limit**: e.g. `10` per user
   - **Users limit** / rate limits: leave defaults on

5. **Create a server API key**
   Console → *Overview* → **Integrations** → **API Keys** → **Create API key**.
   - Name: `nextjs-ssr`
   - **Scopes** (minimum required by this app):
     - `sessions.write` — create email/password & OAuth sessions server-side
   - Optional (only if you later add admin user management): `users.read`, `users.write`
   - Copy the secret **once** — this is `APPWRITE_API_KEY`. Keep it server-side only.

---

## Part 2 — Google OAuth 2.0

### 2a. Google Cloud Console

1. <https://console.cloud.google.com> → create/select a project.
2. **APIs & Services** → **OAuth consent screen**
   - User type: **External** → fill app name, support email, developer email.
   - Scopes: the defaults (`email`, `profile`, `openid`) are enough.
   - Add yourself under **Test users** while in "Testing", or **Publish** the app
     for public use.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs** → add the Appwrite callback (exact format):
     ```
     https://<REGION>.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/<PROJECT_ID>
     ```
     Example:
     ```
     https://fra.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/6650abc123
     ```
   - Create, then copy the **Client ID** and **Client secret**.

### 2b. Enable Google in Appwrite

Console → **Auth** → **OAuth2 Providers** → **Google** → toggle **ON**:
- **App ID** = Google **Client ID**
- **App Secret** = Google **Client secret**
- Save. The redirect URI shown here must match what you entered in Google.

> The app's own success/failure URLs (`/oauth`, `/login`) are validated against
> the **Web platform** hostnames from Part 1 — that's why registering `localhost`
> and your production domain matters.

---

## Part 3 — Environment variables

Create **`.env.local`** in the project root (copy from `.env.example`):

```bash
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key      # SECRET — never NEXT_PUBLIC_*

# Absolute URL of this app — used to build links inside verification /
# password-reset emails. Must match a registered Appwrite platform host.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Existing
GEMINI_API_KEY=your_gemini_api_key
```

| Variable | Public? | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | yes | Appwrite API base URL |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | yes | Project identifier |
| `APPWRITE_API_KEY` | **NO — secret** | Server key for creating sessions |
| `NEXT_PUBLIC_APP_URL` | yes | Base URL for email action links |

In production (e.g. AWS Amplify / Vercel), set the same variables in the
hosting dashboard. Set `NEXT_PUBLIC_APP_URL` to your production origin
(`https://your-domain.com`).

---

## Part 4 — Run

```bash
npm install
npm run dev       # http://localhost:3000
```

Auth routes:

| Route | Purpose |
|-------|---------|
| `/signup` | Create account (email + Google) |
| `/login` | Sign in (email + Google), remember-me, forgot-password link |
| `/forgot-password` | Request a reset link |
| `/reset-password?userId=…&secret=…` | Set a new password (from email) |
| `/verify-email?userId=…&secret=…` | Confirm email (from email) |
| `/account` | Protected — profile, verify status, change password, sign out |
| `/oauth` | OAuth callback (exchanges token → session cookie) |

---

## Part 5 — Product-aligned email templates

Appwrite sends the **verification** and **recovery** emails. Customize them so
they match AI Forge instead of the plain default.

Console → **Auth** → **Templates**. For each template set the **Sender name**,
**Sender email**, **Subject**, and paste the **Message** HTML below.

**Template variables** (use exactly as shown in your console editor — Appwrite
substitutes them at send time):

- `{{project}}` — project name
- `{{user}}` — the user's name
- `{{redirect}}` — the full action URL (already includes `userId` + `secret`)
- `{{team}}` — team name (where applicable)

> `{{redirect}}` is the link users click. It points at `NEXT_PUBLIC_APP_URL` +
> `/verify-email` or `/reset-password` with the token appended — do not hard-code
> URLs, always use `{{redirect}}`.

### 5a. Verification email

- **Subject:** `Confirm your email for AI Forge`

```html
<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#141414;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <span style="font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:600;letter-spacing:1px;">AI&nbsp;FORGE</span>
          </td></tr>
          <tr><td style="padding:20px 32px 8px;">
            <div style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e8562a;">Email confirmation</div>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;">Confirm your email</h1>
          </td></tr>
          <tr><td style="padding:12px 32px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">
            Hi {{user}}, welcome to {{project}}. Confirm this email address to
            secure your account and unlock every tool.
          </td></tr>
          <tr><td style="padding:24px 32px 4px;">
            <a href="{{redirect}}" style="display:inline-block;background:#e8562a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 26px;border-radius:6px;">Confirm email &rarr;</a>
          </td></tr>
          <tr><td style="padding:20px 32px 28px;font-size:12px;line-height:1.6;color:#8a8a8a;">
            If the button doesn't work, copy this link into your browser:<br>
            <a href="{{redirect}}" style="color:#e8562a;word-break:break-all;">{{redirect}}</a><br><br>
            Didn't create an account? You can safely ignore this email. This link
            expires in 7 days.
          </td></tr>
        </table>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a0a0a0;padding:16px 0;">© {{project}} — An AI Workbench for Freelance Developers</div>
      </td></tr>
    </table>
  </body>
</html>
```

### 5b. Password recovery email

- **Subject:** `Reset your AI Forge password`

```html
<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#141414;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <span style="font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:600;letter-spacing:1px;">AI&nbsp;FORGE</span>
          </td></tr>
          <tr><td style="padding:20px 32px 8px;">
            <div style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e8562a;">Account recovery</div>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;">Reset your password</h1>
          </td></tr>
          <tr><td style="padding:12px 32px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">
            Hi {{user}}, we received a request to reset the password for your
            {{project}} account. Choose a new one below.
          </td></tr>
          <tr><td style="padding:24px 32px 4px;">
            <a href="{{redirect}}" style="display:inline-block;background:#e8562a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 26px;border-radius:6px;">Set a new password &rarr;</a>
          </td></tr>
          <tr><td style="padding:20px 32px 28px;font-size:12px;line-height:1.6;color:#8a8a8a;">
            If the button doesn't work, copy this link into your browser:<br>
            <a href="{{redirect}}" style="color:#e8562a;word-break:break-all;">{{redirect}}</a><br><br>
            Didn't request this? You can safely ignore this email — your password
            stays unchanged. This link expires in 1 hour.
          </td></tr>
        </table>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a0a0a0;padding:16px 0;">© {{project}} — An AI Workbench for Freelance Developers</div>
      </td></tr>
    </table>
  </body>
</html>
```

> The accent color `#e8562a` matches the app's primary (`hsl(12 86% 52%)`).
> Email clients ignore web fonts, so IBM Plex Mono falls back to a system
> monospace — that's expected and fine.

---

## Part 6 — Custom SMTP via Resend (required to actually send email)

**Appwrite Cloud does not reliably send auth emails without your own SMTP.**
Configure it or verification / recovery emails silently won't arrive.

We send auth email through **Resend over SMTP**. Appwrite's built-in
verification and recovery flows (the ones this app calls) are delivered by the
project's SMTP settings — *not* by Messaging providers — so Resend is wired in
here as an SMTP relay. Templates stay in **Auth → Templates** (Part 5); Resend
just carries the mail.

### 6a. Resend prerequisites

1. Verify your sending domain in Resend → **Domains** (add the SPF + DKIM DNS
   records Resend shows you and wait for "Verified"). The sender email in
   Appwrite must be on this verified domain.
2. Create a Resend **API key** → **API Keys** (`re_...`). This is the SMTP
   password.

### 6b. Appwrite SMTP settings

Console → **Project Settings** → **SMTP** → toggle **Custom SMTP server** on and
fill in exactly:

| Field | Value |
|-------|-------|
| Sender name | `AI Forge` |
| Sender email | `no-reply@your-domain.com` (must be on the Resend-verified domain) |
| Reply-to email | optional (e.g. `support@your-domain.com`) |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` (literal — the same for every account) |
| Password | your Resend API key (`re_...`) |
| Secure protocol | `SSL` |

> Port/encryption pairs Resend accepts: `465` → **SSL**, or `587`/`2587` →
> **TLS** (STARTTLS). Use `465` + `SSL` unless your host blocks it, then fall
> back to `587` + `TLS`. The username is always the literal string `resend`.

### 6c. Verify delivery

Send a test signup and confirm the verification email arrives (check spam on the
first send). In Resend → **Emails** you'll see each message and its delivery
status, which is the fastest way to debug bounces or DNS issues.

---

## Part 7 — Verification checklist

- [ ] Sign up with email → land on `/account`, "verify your email" banner shows
- [ ] Verification email arrives → clicking it flips `/account` to "verified"
- [ ] Sign out → `/account` redirects to `/login`
- [ ] Sign in without "remember me" → cookie clears when the browser closes
- [ ] Sign in **with** "remember me" → session persists ~30 days
- [ ] Forgot password → email arrives → reset link sets a new password → sign in
- [ ] Change password from `/account` with correct current password
- [ ] Google sign-in → returns to `/account` authenticated
- [ ] Visiting `/login` while signed in redirects to `/account`
- [ ] Visiting `/account` while signed out redirects to `/login?redirect=/account`

---

## How it fits together (reference)

| File | Role |
|------|------|
| `lib/appwrite/config.ts` | Env config, cookie name, remember-me window |
| `lib/appwrite/server.ts` | Admin / public / session clients, `getLoggedInUser()` |
| `lib/appwrite/auth.ts` | All Server Actions (signup, login, OAuth, recovery, verify, change password) |
| `lib/appwrite/utils.ts` | Base-URL helper, validation, error mapping |
| `app/oauth/route.ts` | OAuth callback → session cookie |
| `proxy.ts` | Route protection (cookie presence) |
| `app/(auth)/*` | Login / signup / forgot / reset / verify pages |
| `app/account/page.tsx` | Protected account area |
| `components/auth/*` | Client forms and account UI |

### Security notes

- Session secret lives in an **httpOnly + Secure (prod) + SameSite=Lax** cookie.
- The API key (`APPWRITE_API_KEY`) is only ever read server-side.
- `forgot-password` always returns success to prevent **account enumeration**.
- Recovery / verification use the **public client** (secret-authenticated), so
  the API key only needs `sessions.write`.
- `proxy.ts` does a fast cookie presence check; every protected page
  additionally validates the real session server-side via `getLoggedInUser()`.
