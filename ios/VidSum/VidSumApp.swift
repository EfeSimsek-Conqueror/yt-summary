import SwiftUI

@main
struct VidSumApp: App {
  @StateObject private var appModel = AppViewModel()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(appModel)
    }
  }
}
