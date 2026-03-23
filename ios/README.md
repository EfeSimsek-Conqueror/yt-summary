# VidSum (iOS)

Native **Swift / SwiftUI** client for the same Supabase + Google + YouTube Data flow as `web/`.

## Prerequisites

- Xcode **15+** (iOS **17** SDK)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

## Setup

1. **Secrets**  
   Supabase URL and anon key are in **`Info.plist`** as `SUPABASE_URL` and `SUPABASE_ANON_KEY` (primary). `AppSecrets.swift` is only a fallback.  
   If Safari still opens `your_project_ref.supabase.co`, you are running an old build: **delete the app from the phone**, in Xcode **Product → Clean Build Folder**, then Run again.  
   In **Supabase → Authentication → URL Configuration**, ensure **Site URL** is not a placeholder.

2. **Generate the Xcode project**

   ```bash
   cd ios
   xcodegen generate
   open VidSum.xcodeproj
   ```

3. **Supabase Auth → Redirect URLs**  
   Add **exactly**:

   - `vidsum://auth-callback`

   This must match `SupabaseManager` and `Info.plist` (`CFBundleURLSchemes` = `vidsum`).  
   If this is missing, **Google sign-in** can fail with `WebAuthenticationSession error 1`.

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

### Assets içinde yalnızca `AccentColor` görünüyor, `AppIcon` yok / “matching … app icon set”

Repo güncel değil veya yanlış klasör açılmış olabilir.

1. Terminal:

   ```bash
   cd /path/to/yt-summary   # veya youtube-summary-fullstack
   git pull origin main
   ls VidSum/Resources/Assets.xcassets/AppIcon.appiconset
   ```

   Çıktıda **`AppIcon.png`** ve **`Contents.json`** görünmeli. Yoksa pull çalışmadı veya bu repo değil.

2. Xcode’u kapatıp `ios/VidSum.xcodeproj`’ü tekrar açın; solda **Assets** → `AppIcon` satırı görünmeli.

3. Hâlâ yoksa: **File → Packages → Reset Package Caches** (SPM) ve **Product → Clean Build Folder** (⇧⌘K).

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
