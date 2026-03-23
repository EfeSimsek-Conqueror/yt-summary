import SwiftUI

private enum HomeSearchScope: String, CaseIterable {
  case channels = "Channels"
  case videos = "Videos"
}

struct HomeView: View {
  @EnvironmentObject private var appModel: AppViewModel

  @State private var channels: [YTChannel] = []
  @State private var isLoadingChannels = false
  @State private var loadError: String?
  @State private var searchText = ""
  @State private var searchScope: HomeSearchScope = .channels
  @State private var videoSearchResults: [YTVideo] = []
  @State private var isSearchingVideos = false
  @State private var videoSearchError: String?
  @State private var videoSearchTask: Task<Void, Never>?

  private var appVersionLabel: String {
    let v =
      Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
    let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
    return "\(v) (\(b))"
  }

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
          List {
            Section {
              Picker("Search scope", selection: $searchScope) {
                ForEach(HomeSearchScope.allCases, id: \.self) { scope in
                  Text(scope.rawValue).tag(scope)
                }
              }
              .pickerStyle(.segmented)
            }

            if searchScope == .channels {
              ForEach(filteredChannels) { ch in
                NavigationLink(value: ch) {
                  ChannelRow(channel: ch)
                }
              }
            } else {
              videoSearchSection
            }
          }
          .listStyle(.plain)
        }
      }
      .navigationTitle("Subscriptions")
      .navigationBarTitleDisplayMode(.inline)
      .searchable(
        text: $searchText,
        prompt: searchScope == .channels ? "Search subscribed channels" : "Search YouTube videos"
      )
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Text(appVersionLabel)
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .accessibilityLabel("App version \(appVersionLabel)")
        }
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
      .navigationDestination(for: YTVideo.self) { video in
        VideoDetailView(video: video)
      }
      .onChange(of: searchText) { _, newValue in
        guard searchScope == .videos else { return }
        videoSearchTask?.cancel()
        videoSearchTask = Task {
          try? await Task.sleep(nanoseconds: 450_000_000)
          guard !Task.isCancelled else { return }
          await runVideoSearch(query: newValue)
        }
      }
      .onChange(of: searchScope) { _, newScope in
        videoSearchTask?.cancel()
        if newScope == .channels {
          videoSearchResults = []
          videoSearchError = nil
        } else {
          Task { await runVideoSearch(query: searchText) }
        }
      }
    }
    .task(id: appModel.session?.user.id) {
      await loadChannels()
    }
  }

  @ViewBuilder
  private var videoSearchSection: some View {
    let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    if isSearchingVideos, q.count >= 2 {
      HStack {
        Spacer()
        ProgressView()
        Spacer()
      }
    } else if let videoSearchError {
      Text(videoSearchError)
        .font(.caption)
        .foregroundStyle(.red)
    } else if q.count < 2 {
      Text("Type at least 2 characters to search videos on YouTube.")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    } else if videoSearchResults.isEmpty {
      Text("No videos found.")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    } else {
      ForEach(videoSearchResults) { video in
        NavigationLink(value: video) {
          VideoRow(video: video)
        }
      }
    }
  }

  private func runVideoSearch(query: String) async {
    guard let token = appModel.session?.providerToken else { return }
    let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
    guard q.count >= 2 else {
      videoSearchResults = []
      videoSearchError = nil
      return
    }
    isSearchingVideos = true
    videoSearchError = nil
    defer { isSearchingVideos = false }
    do {
      videoSearchResults = try await YouTubeService.searchVideos(accessToken: token, query: q)
    } catch {
      videoSearchError = error.localizedDescription
      videoSearchResults = []
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
