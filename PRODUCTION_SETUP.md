# TwinkleGo production activation

The public Supabase key and the server key are different credentials. Never use
`sb_publishable_...` or an `anon` JWT as `SUPABASE_SERVICE_ROLE_KEY`.

## 1. Create a Supabase server key

1. Open the Supabase project `qtgvfnlageqhhtrpxkrw`.
2. Go to **Settings > API Keys**.
3. Under **Secret keys**, create a key named `twinklego-vercel-production`.
4. Copy the `sb_secret_...` value once. Do not put it in source control, chat,
   browser code, a `NEXT_PUBLIC_` variable, or a URL.

The legacy `service_role` JWT also works, but a new `sb_secret_...` key is the
recommended credential.

## 2. Replace the Vercel variable

1. Open Vercel project **twinkle-go > Settings > Environment Variables**.
2. Edit `SUPABASE_SERVICE_ROLE_KEY`.
3. Replace its current public value with the Supabase `sb_secret_...` value.
4. Select **Production** and **Preview**, mark it sensitive, and save.
5. Redeploy the latest production deployment. Environment changes do not affect
   deployments that already exist.

Verify without printing the key:

```powershell
Invoke-RestMethod https://twinkle-go.vercel.app/api/health/supabase
```

Both `hasServiceRoleKey` and `hasValidServiceRoleKey` must be `true`.

## 3. Apply the database schema

1. Open **Supabase > SQL Editor > New query**.
2. Paste the complete contents of `supabase.sql` from this repository.
3. Run the query and confirm it completes without an error.

The script is idempotent and creates the tables, triggers, storage policies,
task tracking, admin audit log, and restricted Row Level Security policies.

## 4. Create the first super-admin

1. Create a random value of at least 32 characters.
2. Add it in Vercel as `SUPER_ADMIN_BOOTSTRAP_SECRET` for Production.
3. Redeploy production again.
4. In PowerShell, run the following and enter the secret and password only when
   prompted:

```powershell
$secret = Read-Host "Bootstrap secret" -MaskInput
$password = Read-Host "Admin password (12+ characters)" -MaskInput
$body = @{
  secret = $secret
  email = "YOUR_ADMIN_EMAIL"
  password = $password
  full_name = "YOUR_NAME"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://twinkle-go.vercel.app/api/admin/bootstrap" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

Remove-Variable secret, password, body
```

5. A successful response contains `"success": true`.
6. Remove `SUPER_ADMIN_BOOTSTRAP_SECRET` from Vercel and redeploy. The endpoint
   also refuses to run after a super-admin exists.

## 5. Access and verify the admin console

1. Sign in at `https://twinkle-go.vercel.app/login` with the admin credentials.
2. Open `https://twinkle-go.vercel.app/admin`.
3. Verify **Users**, **Verifications**, **Disputes**, **All Errands**, and
   **Audit Log**.

New public signups are created server-side with `email_confirm: true`, so they
do not send a confirmation email and immediately sign in after account creation.

