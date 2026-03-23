# VidSum (iOS)

Native **Swift / SwiftUI** client for the same Supabase + Google + YouTube Data flow as `web/`.

## Prerequisites

- Xcode **15+** (iOS **17** SDK)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

## Setup

1. **Secrets**  
   Open `VidSum/AppSecrets.swift` and replace `YOUR_PROJECT_REF` / `YOUR_SUPABASE_ANON_KEY` with the same values as `web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).  
   The file is **in the repo** so Xcode always finds it after clone; do not commit real keys to a **public** repo (use a private fork or keep local-only changes).

2. **Generate the Xcode project**

   ```bash
   cd ios
   xcodegen generate
   open VidSum.xcodeproj
   ```

3. **Supabase Auth → Redirect URLs**  
   Add:

   - `vidsum://auth-callback`

   This must match `SupabaseManager` and `Info.plist` (`CFBundleURLSchemes` = `vidsum`).

4. **Google Cloud OAuth (iOS)**  
   For some setups you also add the app’s bundle ID and redirect to Google’s OAuth client used by Supabase. Follow [Supabase: Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google?platform=swift) for native apps.

5. **YouTube Data API v3**  
   Same as web: enable the API on your Google Cloud project and ensure the Google provider in Supabase requests **`youtube.readonly`** (users may need to sign out/in after scope changes).

## What’s included

- Google sign-in via **Supabase** (`ASWebAuthenticationSession`)
- **Subscriptions** list (`subscriptions.list`)
- **Recent uploads** per channel (uploads playlist → `playlistItems` → `videos`)
- Video **detail** screen (summary text; full transcript + AI analysis still live in the web app today)

## App icon

The repo includes a minimal **AppIcon** (1024×1024) so Xcode validates the asset catalog. Replace it in `Assets.xcassets/AppIcon` before App Store submission if you want a branded icon.

## Sorun giderme

### “Build input file cannot be found: …/AppSecrets.swift”

Xcode **yalnızca** `ios/VidSum/AppSecrets.swift` dosyasını derler; adı **`AppSecrets.swift.example` olan dosya aynı şey değildir**.

- Projede **mutlaka** `VidSum/AppSecrets.swift` olmalı (uzantı `.swift`, isimde `.example` yok).
- Elinizde sadece `AppSecrets.swift.example` varsa Finder veya Terminal ile kopyalayın:

  ```bash
  cd ios/VidSum
  cp AppSecrets.swift.example AppSecrets.swift
  ```

  Sonra Xcode’da sol panelden **`.example` dosyasını projeye eklemişseniz** onu kaldırın; derlenmesi gereken tek dosya `AppSecrets.swift`.

- En güncel hali için: repo kökünde `git pull`, `ios/VidSum/AppSecrets.swift` Git’te gelmiş olmalı.

### “Signing requires a development team”

Xcode → hedef **VidSum** → **Signing & Capabilities** → **Team** alanından Apple ID ile bir ekip seçin (kişisel hesap yeterli).
