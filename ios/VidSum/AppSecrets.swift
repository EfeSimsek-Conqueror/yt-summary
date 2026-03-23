import Foundation

/// Supabase — same project as `web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
enum AppSecrets {
  static let supabaseURL = URL(string: "https://rrkdbtuppxjhagpgefax.supabase.co")!
  static let supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJya2RidHVwcHhqaGFncGdlZmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTM0NTQsImV4cCI6MjA4OTc4OTQ1NH0.Ynmnbt0vYt_0cMVr9dT763lxpt3dQlQCD8BhEVSgZks"
}
