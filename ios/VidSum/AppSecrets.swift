import Foundation

/// Supabase anon key + URL (same as `web/.env.local`).
/// Replace placeholders below for real sign-in; do not commit real keys to public repos.
enum AppSecrets {
  static let supabaseURL = URL(string: "https://YOUR_PROJECT_REF.supabase.co")!
  static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
}
