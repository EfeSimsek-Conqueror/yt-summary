import SwiftUI

@main
struct VidSumApp: App {
  @StateObject private var appModel = AppViewModel()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(appModel)
        .onOpenURL { url in
          if OAuthCallbackBridge.receiveCallback(url) {
            // Completes `openAuthAndWait` — session is finished in `signInWithGoogle`
            return
          }
          SupabaseManager.client.auth.handle(url)
          Task { await appModel.refreshSession() }
        }
    }
  }
}
