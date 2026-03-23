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

  func signInWithGoogle() async {
    isSigningIn = true
    errorMessage = nil
    defer { isSigningIn = false }
    do {
      let scopes = [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ].joined(separator: " ")

      let redirect = URL(string: "vidsum://auth-callback")!
      _ = try await client.auth.signInWithOAuth(
        provider: .google,
        redirectTo: redirect,
        scopes: scopes,
        queryParams: [
          ("access_type", "offline"),
          ("prompt", "consent"),
        ],
        configure: { session in
          // Avoid “error 1” / canceled session on some devices when ephemeral Safari is forced
          session.prefersEphemeralWebBrowserSession = false
        }
      )
    } catch {
      errorMessage = error.localizedDescription
    }
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
