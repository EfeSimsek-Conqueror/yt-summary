import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var appModel: AppViewModel

  var body: some View {
    Group {
      if appModel.session != nil {
        HomeView()
      } else {
        LoginView()
      }
    }
    .animation(.easeInOut(duration: 0.2), value: appModel.session != nil)
  }
}

#Preview {
  ContentView()
    .environmentObject(AppViewModel())
}
