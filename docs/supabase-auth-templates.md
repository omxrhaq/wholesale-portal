# Supabase Auth Templates

Gebruik deze templates in `Supabase Dashboard -> Authentication -> Templates`.

Aanbevolen templates om eerst aan te passen:
- `Invite user`
- `Reset password`

Gebruik voor beide templates dezelfde merktoon:
- Sender name: `Wholesale Portal`
- Sender email: `no-reply@auth.wp.com`

## Important

Gebruik **niet** `{{ .ConfirmationURL }}` voor deze app.

Deze app gebruikt server-side auth en verwacht dat de mail eerst naar onze eigen callback gaat met:
- `token_hash`
- `type`
- `redirect_to`

Als je toch `{{ .ConfirmationURL }}` gebruikt, kunnen links verlopen lijken of op de verkeerde pagina landen.

## Invite user

### Subject

```txt
Set your password for Wholesale Portal
```

### HTML

```html
<div style="margin:0;padding:32px 16px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:16px;overflow:hidden;">
    <div style="padding:32px 32px 16px 32px;">
      <p style="margin:0 0 12px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
        Wholesale Portal
      </p>
      <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.2;color:#0f172a;">
        Create your password
      </h1>
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#334155;">
        Your customer portal account is ready. Click the button below to create your password and access your ordering portal.
      </p>
      <div style="margin:28px 0;">
        <a
          href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}"
          style="display:inline-block;padding:14px 22px;background:#1d4ed8;border-radius:10px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;"
        >
          Create password
        </a>
      </div>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#475569;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.7;word-break:break-word;color:#1d4ed8;">
        {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}
      </p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
        If you were not expecting this email, you can safely ignore it.
      </p>
    </div>
  </div>
</div>
```

## Reset password

### Subject

```txt
Reset your Wholesale Portal password
```

### HTML

```html
<div style="margin:0;padding:32px 16px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:16px;overflow:hidden;">
    <div style="padding:32px 32px 16px 32px;">
      <p style="margin:0 0 12px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
        Wholesale Portal
      </p>
      <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.2;color:#0f172a;">
        Reset your password
      </h1>
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#334155;">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>
      <div style="margin:28px 0;">
        <a
          href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}"
          style="display:inline-block;padding:14px 22px;background:#1d4ed8;border-radius:10px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;"
        >
          Reset password
        </a>
      </div>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#475569;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.7;word-break:break-word;color:#1d4ed8;">
        {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}
      </p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
        If you did not request a password reset, you can ignore this email.
      </p>
    </div>
  </div>
</div>
```

## Paste locations

- `Authentication -> Templates -> Invite user`
- `Authentication -> Templates -> Reset password`

## After Updating

- Save both templates in Supabase.
- Send a completely new invite or reset email.
- Old mails and old tokens may still be invalid or point to the previous flow.
