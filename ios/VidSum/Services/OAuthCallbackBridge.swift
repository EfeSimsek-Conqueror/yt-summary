import Foundation
import UIKit

/// Bridges Safari OAuth (`UIApplication.open`) with `vidsum://` return via `onOpenURL`.
/// More reliable on physical devices than `ASWebAuthenticationSession` alone.
@MainActor
enum OAuthCallbackBridge {
  private static var pending: CheckedContinuation<URL, Error>?
  /// Suppress duplicate delivery when both `AppDelegate` and SwiftUI deliver the same URL.
  private static var lastDedupKey: String?
  private static var lastDedupAt: Date?

  /// Single entry for AppDelegate + SwiftUI: resume Safari wait or let Supabase parse the callback.
  static func processIncomingOAuthURL(_ url: URL) async {
    if url.scheme?.lowercased() == "vidsum" {
      let key = url.absoluteString
      if let prev = lastDedupKey, prev == key, let t = lastDedupAt, Date().timeIntervalSince(t) < 1.5 {
        return
      }
      lastDedupKey = key
      lastDedupAt = Date()
    }

    if receiveCallback(url) { return }
    SupabaseManager.client.auth.handle(url)
  }

  /// Call from `onOpenURL` when `vidsum://auth-callback?...` arrives.
  /// Returns `true` if this URL completed a pending OAuth wait.
  @discardableResult
  static func receiveCallback(_ url: URL) -> Bool {
    guard url.scheme?.lowercased() == "vidsum" else { return false }
    guard let cont = pending else { return false }
    pending = nil
    cont.resume(returning: url)
    return true
  }

  static func cancelPending() {
    guard let cont = pending else { return }
    pending = nil
    cont.resume(throwing: CancellationError())
  }

  /// Opens the Supabase authorize URL in Safari and suspends until the app reopens with the callback.
  static func openAuthAndWait(authURL: URL) async throws -> URL {
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<URL, Error>) in
      pending = cont
      UIApplication.shared.open(authURL, options: [:]) { success in
        Task { @MainActor in
          guard pending != nil else { return }
          if !success {
            pending = nil
            cont.resume(
              throwing: NSError(
                domain: "VidSumOAuth",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Could not open Safari for sign-in."]
              )
            )
          }
        }
      }
    }
  }
}
