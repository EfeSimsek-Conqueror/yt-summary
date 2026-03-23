import AuthenticationServices
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

  /// Uses `ASWebAuthenticationSession` (via Supabase `signInWithOAuth` + **named** `configure:`).
  /// Full Safari + `UIApplication.open` showed “Safari can’t open the page” after Google because the
  /// `vidsum://` redirect isn’t a normal web page — the auth session intercepts it instead.
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

      _ = try await client.auth.signInWithOAuth(
        provider: .google,
        redirectTo: redirect,
        scopes: scopes,
        queryParams: [
          ("access_type", "offline"),
          ("prompt", "consent"),
        ],
        configure: { session in
          session.prefersEphemeralWebBrowserSession = false
        }
      )
      await refreshSession()
    } catch {
      if error is CancellationError { return }
      errorMessage = Self.describeSignInError(error)
    }
  }

  private static func describeSignInError(_ error: Error) -> String {
    let ns = error as NSError
    if ns.domain == ASWebAuthenticationSessionErrorDomain, ns.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
      return "Sign-in was cancelled. Try again."
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
