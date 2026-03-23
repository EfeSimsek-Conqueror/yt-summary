import SwiftUI

struct VideoListView: View {
  let channel: YTChannel
  let accessToken: String?

  @State private var videos: [YTVideo] = []
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var searchText = ""

  private var filteredVideos: [YTVideo] {
    let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    if q.isEmpty { return videos }
    return videos.filter { $0.title.localizedCaseInsensitiveContains(q) }
  }

  var body: some View {
    Group {
      if isLoading && videos.isEmpty {
        ProgressView("Loading videos…")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if let errorMessage {
        ContentUnavailableView(
          "Couldn’t load videos",
          systemImage: "exclamationmark.triangle",
          description: Text(errorMessage)
        )
      } else if videos.isEmpty {
        ContentUnavailableView(
          "No videos",
          systemImage: "film",
          description: Text("No recent uploads in this channel’s feed.")
        )
      } else {
        List(filteredVideos) { video in
          NavigationLink(destination: VideoDetailView(video: video)) {
            VideoRow(video: video)
          }
        }
        .listStyle(.plain)
      }
    }
    .navigationTitle(channel.title)
    .navigationBarTitleDisplayMode(.inline)
    .searchable(text: $searchText, prompt: "Search videos in this channel")
    .task(id: channel.id) {
      await loadVideos()
    }
  }

  private func loadVideos() async {
    guard let accessToken else {
      errorMessage = "Not signed in. Open the app and sign in with Google."
      return
    }
    isLoading = true
    errorMessage = nil
    defer { isLoading = false }
    do {
      videos = try await YouTubeService.fetchChannelUploads(
        accessToken: accessToken,
        channelId: channel.id,
        maxResults: 24
      )
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}
