import Foundation

/// Supabase URL + anon key (same as `web/.env.local`: `NEXT_PUBLIC_*`).
/// Replace placeholders below — sign-in will not work until you do.
enum AppSecrets {
  static let supabaseURL = URL(string: "https://YOUR_PROJECT_REF.supabase.co")!
  static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
}
