import Foundation
import Supabase
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
  @Published private(set) var session: Session?
  @Published var errorMessage: String?
  @Published var isSigningIn = false

  private let client = SupabaseManager.client
  private var authTask: Task<Void, Never>?

  init() {
    authTask = Task { await observeAuth() }
    Task { await refreshSession() }
  }

  deinit {
    authTask?.cancel()
  }

  func refreshSession() async {
    do {
      session = try await client.auth.session
    } catch {
      session = client.auth.currentSession
    }
  }

  private func observeAuth() async {
    for await (_, sess) in client.auth.authStateChanges {
      session = sess
    }
  }

  /// Safari (`UIApplication.open`) + `vidsum://` — **does not** use `ASWebAuthenticationSession`
  /// (avoids `WebAuthenticationSession error 1` when Swift resolves the wrong `signInWithOAuth` overload).
  func signInWithGoogle() async {
    isSigningIn = true
    errorMessage = nil
    defer { isSigningIn = false }
    OAuthCallbackBridge.cancelPending()
    do {
      let redirect = URL(string: "vidsum://auth-callback")!
      let scopes = [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ].joined(separator: " ")

      let authURL = try client.auth.getOAuthSignInURL(
        provider: .google,
        scopes: scopes,
        redirectTo: redirect,
        queryParams: [
          ("access_type", "offline"),
          ("prompt", "consent"),
        ]
      )
      let resultURL = try await OAuthCallbackBridge.openAuthAndWait(authURL: authURL)
      _ = try await client.auth.session(from: resultURL)
      await refreshSession()
    } catch {
      if error is CancellationError { return }
      errorMessage = Self.describeSignInError(error)
    }
  }

  private static func describeSignInError(_ error: Error) -> String {
    let ns = error as NSError
    // Same domain as `ASWebAuthenticationSession` failures (we avoid that API; kept for stale builds / system quirks).
    if ns.domain == "com.apple.AuthenticationServices.WebAuthenticationSession" {
      return "Sign-in was cancelled or could not open the browser. Try again."
    }
    return error.localizedDescription
  }

  func signOut() async {
    do {
      try await client.auth.signOut()
      session = nil
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}
