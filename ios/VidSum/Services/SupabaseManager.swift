import Foundation
import Supabase

enum SupabaseManager {
  /// Must match `CFBundleURLSchemes` in Info.plist and Supabase Dashboard → Auth → Redirect URLs.
  private static let oauthRedirect = URL(string: "vidsum://auth-callback")!

  /// Prefer `Info.plist` (`SUPABASE_URL` / `SUPABASE_ANON_KEY`) so OAuth always uses the bundled host
  /// even if an outdated `AppSecrets.swift` is left in the project folder.
  private static func loadSupabaseURL() -> URL {
    if let s = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
       let u = URL(string: s),
       !s.lowercased().contains("your_project_ref")
    {
      return u
    }
    return AppSecrets.supabaseURL
  }

  private static func loadAnonKey() -> String {
    if let s = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
       !s.isEmpty,
       !s.contains("YOUR_SUPABASE_ANON_KEY")
    {
      return s
    }
    return AppSecrets.supabaseAnonKey
  }

  static let client: SupabaseClient = {
    SupabaseClient(
      supabaseURL: loadSupabaseURL(),
      supabaseKey: loadAnonKey(),
      options: SupabaseClientOptions(
        auth: .init(redirectToURL: oauthRedirect)
      )
    )
  }()
}
