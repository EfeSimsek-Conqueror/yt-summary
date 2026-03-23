import UIKit

/// Delivers OAuth callback URLs on physical devices where SwiftUI `onOpenURL` can be unreliable
/// (cold start, background return). Keep logic in sync with `OAuthCallbackBridge` + Supabase `handle`.
final class AppDelegate: NSObject, UIApplicationDelegate {
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    if let url = launchOptions?[.url] as? URL {
      Task { @MainActor in
        await OAuthCallbackBridge.processIncomingOAuthURL(url)
      }
    }
    return true
  }

  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    Task { @MainActor in
      await OAuthCallbackBridge.processIncomingOAuthURL(url)
    }
    return true
  }
}
