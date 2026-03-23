import Foundation
import Supabase

enum SupabaseManager {
  /// Must match `CFBundleURLSchemes` in Info.plist and Supabase Dashboard → Auth → Redirect URLs.
  private static let oauthRedirect = URL(string: "vidsum://auth-callback")!

  /// If Info.plist or `AppSecrets` still contain the template host (`your_project_ref…`), Safari shows
  /// “server can’t be found”. These compile-time values are the last resort so OAuth never uses a placeholder.
  private static let embeddedSupabaseURL = URL(string: "https://rrkdbtuppxjhagpgefax.supabase.co")!
  private static let embeddedAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJya2RidHVwcHhqaGFncGdlZmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTM0NTQsImV4cCI6MjA4OTc4OTQ1NH0.Ynmnbt0vYt_0cMVr9dT763lxpt3dQlQCD8BhEVSgZks"

  private static func isPlaceholderSupabaseURLString(_ raw: String) -> Bool {
    let s = raw.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    if s.isEmpty { return true }
    return s.contains("your_project_ref")
      || s.contains("your-project-ref")
      || s.contains("placeholder")
  }

  private static func isPlaceholderAnonKey(_ raw: String) -> Bool {
    raw.isEmpty || raw.contains("YOUR_SUPABASE_ANON_KEY") || raw.lowercased().contains("your_anon")
  }

  /// Prefer `Info.plist`, then `AppSecrets`, then `embeddedSupabaseURL` (never a placeholder).
  private static func loadSupabaseURL() -> URL {
    if let s = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
       !isPlaceholderSupabaseURLString(s),
       let u = URL(string: s),
       u.host?.contains("supabase.co") == true
    {
      return u
    }
    let fromSecrets = AppSecrets.supabaseURL
    if !isPlaceholderSupabaseURLString(fromSecrets.absoluteString),
       fromSecrets.host?.contains("supabase.co") == true
    {
      return fromSecrets
    }
    return embeddedSupabaseURL
  }

  private static func loadAnonKey() -> String {
    if let s = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
       !isPlaceholderAnonKey(s)
    {
      return s
    }
    if !isPlaceholderAnonKey(AppSecrets.supabaseAnonKey) {
      return AppSecrets.supabaseAnonKey
    }
    return embeddedAnonKey
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
