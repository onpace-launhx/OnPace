# OnPace production integrations

The application code and database migration are ready, but the Supabase project
must be linked and the Edge Functions must be deployed before AI and Resend work
in production.

## Safe deployment order

1. Sign in to the Supabase CLI account that owns the project used by
   `NEXT_PUBLIC_SUPABASE_URL`.

   ```powershell
   supabase login
   supabase link --project-ref <PROJECT_REF>
   ```

2. Apply the canonical migration.

   ```powershell
   supabase db push
   ```

3. Deploy the authenticated integration functions.

   ```powershell
   supabase functions deploy ai-gateway
   supabase functions deploy integration-config
   supabase functions deploy admin-email-broadcast
   supabase functions deploy r2-upload
   supabase functions deploy auth-email-hook --no-verify-jwt
   ```

4. In the OnPace super-admin panel, configure:

   - Gemini or OpenAI API key and active provider
   - Resend API key
   - Cloudflare R2 access key, secret key, endpoint, bucket, and public URL
   - verified sender address and sender name
   - localized payment-disabled messages and all paid-plan prices

   Secrets are written to Supabase Vault by `integration-config`. They are never
   returned to the browser. Do not put provider keys in a `NEXT_PUBLIC_*`
   variable.

## Resend and email verification

1. In Resend, add the production sending domain and complete its DNS
   verification. Use an address on that verified domain in the admin panel.
2. In Supabase Authentication, enable **Confirm email** and **Secure email
   change**.
3. Add the production site URL and these redirect URLs:

   - `https://<APP_DOMAIN>/auth/callback`
   - `https://<APP_DOMAIN>/set-password`

4. In Authentication Hooks, enable the **Send Email Hook** and set its URL to:

   `https://<PROJECT_REF>.supabase.co/functions/v1/auth-email-hook`

5. Copy the generated hook secret into Edge Function secrets:

   ```powershell
   supabase secrets set SEND_EMAIL_HOOK_SECRET="<HOOK_SECRET>"
   ```

6. Test signup, password recovery, and email change in every supported language
   (`en`, `tr`, `es`, `zh`). Do this before enabling signups for real users.

Security/account emails ignore marketing consent. Admin announcements and
campaign emails are restricted to users who opted in unless the administrator
explicitly marks the message as a mandatory service/security notice. The same
admin broadcast can also create dashboard notifications.

## AI

The Next.js API routes invoke `ai-gateway`; the Edge Function reads the selected
provider key from Vault. The default Gemini model is `gemini-2.5-flash`. Override
models only with non-public Edge Function environment variables:

```powershell
supabase secrets set GEMINI_MODEL="gemini-2.5-flash"
supabase secrets set OPENAI_MODEL="gpt-4o-mini"
```

After successful deployment and smoke tests, clear any old plaintext API-key
columns left in `system_settings`. Browser access to that table and the legacy
key-returning RPC are already revoked by the migration.

## Payments

Payments remain off until a provider is selected. The current checkout is
provider-neutral and only accepts a hosted, PCI-compliant checkout URL. It never
collects card data and never grants a plan from a browser request.

When a provider is selected:

1. Implement its adapter in `src/lib/payments/server.ts`.
2. Store its credentials in Supabase Vault through a provider-specific extension
   to `integration-config`.
3. Add a signed webhook Edge Function.
4. Activate plans only after verifying the provider webhook.
5. Mark `payment_provider_configured` only after a real test checkout and webhook
   pass.

Until those steps are complete, leave payment collection disabled in the admin
panel. Admin subscription cancellations only update OnPace access and create an
audit event; a real refund must still be made in the payment provider dashboard.

## Smoke-test checklist

- Unverified email cannot sign in.
- Signup/recovery/email-change emails arrive in the profile language.
- AI chat returns a provider error instead of a fake canned success.
- Calendar Google notice appears only when Google is not connected.
- Screenshot OCR can create reviewed calendar items.
- “Plan my day” uses the user's real incomplete tasks and existing sessions.
- Non-mandatory email excludes opted-out users.
- Email + dashboard broadcast creates both deliveries.
- Maintenance mode blocks normal users but allows admins and explicitly
  authorized users.
- Checkout cannot activate a subscription without a verified payment webhook.
