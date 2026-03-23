import SwiftUI

@main
struct VidSumApp: App {
  @StateObject private var appModel = AppViewModel()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(appModel)
        .onOpenURL { url in
          // OAuth redirect (vidsum://auth-callback?...) — required for reliable PKCE completion on device
          SupabaseManager.client.auth.handle(url)
          Task { await appModel.refreshSession() }
        }
    }
  }
}
