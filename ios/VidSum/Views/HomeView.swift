import SwiftUI

struct HomeView: View {
  @EnvironmentObject private var appModel: AppViewModel

  @State private var channels: [YTChannel] = []
  @State private var isLoadingChannels = false
  @State private var loadError: String?
  @State private var searchText = ""

  private var filteredChannels: [YTChannel] {
    let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    if q.isEmpty { return channels }
    return channels.filter { $0.title.localizedCaseInsensitiveContains(q) }
  }

  var body: some View {
    NavigationStack {
      Group {
        if isLoadingChannels && channels.isEmpty {
          ProgressView("Loading subscriptions…")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let loadError {
          ContentUnavailableView(
            "Couldn’t load subscriptions",
            systemImage: "exclamationmark.triangle",
            description: Text(loadError)
          )
        } else {
          List(filteredChannels) { ch in
            NavigationLink(value: ch) {
              ChannelRow(channel: ch)
            }
          }
          .listStyle(.plain)
        }
      }
      .navigationTitle("Abonelikler")
      .navigationBarTitleDisplayMode(.large)
      .searchable(text: $searchText, prompt: "Kanallarda ara")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            Task { await appModel.signOut() }
          } label: {
            Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
          }
        }
      }
      .navigationDestination(for: YTChannel.self) { ch in
        VideoListView(channel: ch, accessToken: appModel.session?.providerToken)
      }
    }
    .task(id: appModel.session?.user.id) {
      await loadChannels()
    }
  }

  private func loadChannels() async {
    guard let token = appModel.session?.providerToken else {
      loadError =
        "Missing Google access token. Sign out, then sign in again with YouTube access."
      return
    }
    isLoadingChannels = true
    loadError = nil
    defer { isLoadingChannels = false }
    do {
      channels = try await YouTubeService.fetchSubscriptions(accessToken: token)
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct ChannelRow: View {
  let channel: YTChannel

  var body: some View {
    HStack(spacing: 12) {
      AsyncImage(url: channel.thumbnailURL) { phase in
        switch phase {
        case .empty:
          RoundedRectangle(cornerRadius: 6)
            .fill(.quaternary)
            .frame(width: 40, height: 40)
        case let .success(img):
          img
            .resizable()
            .scaledToFill()
            .frame(width: 40, height: 40)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        case .failure:
          RoundedRectangle(cornerRadius: 6)
            .fill(.quaternary)
            .frame(width: 40, height: 40)
        @unknown default:
          EmptyView()
        }
      }
      Text(channel.title)
        .lineLimit(2)
    }
  }
}
