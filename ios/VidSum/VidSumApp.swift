import SwiftUI

@main
struct VidSumApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
  @StateObject private var appModel = AppViewModel()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(appModel)
        .onOpenURL { url in
          Task { await OAuthCallbackBridge.processIncomingOAuthURL(url) }
        }
    }
  }
}
