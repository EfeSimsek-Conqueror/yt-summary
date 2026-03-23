import Foundation
import Supabase

enum SupabaseManager {
  /// Must match `CFBundleURLSchemes` in Info.plist and Supabase Dashboard → Auth → Redirect URLs.
  private static let oauthRedirect = URL(string: "vidsum://auth-callback")!

  static let client: SupabaseClient = SupabaseClient(
    supabaseURL: AppSecrets.supabaseURL,
    supabaseKey: AppSecrets.supabaseAnonKey,
    options: SupabaseClientOptions(
      auth: .init(redirectToURL: oauthRedirect)
    )
  )
}
