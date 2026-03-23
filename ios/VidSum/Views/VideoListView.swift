import SwiftUI

struct VideoListView: View {
  let channel: YTChannel
  let accessToken: String?

  @State private var videos: [YTVideo] = []
  @State private var isLoading = false
  @State private var errorMessage: String?

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
          "No uploads",
          systemImage: "film",
          description: Text("This channel has no recent uploads in the feed.")
        )
      } else {
        List(videos) { video in
          NavigationLink(destination: VideoDetailView(video: video)) {
            VideoRow(video: video)
          }
        }
      }
    }
    .navigationTitle(channel.title)
    .navigationBarTitleDisplayMode(.inline)
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

private struct VideoRow: View {
  let video: YTVideo

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      AsyncImage(url: video.thumbnailURL) { phase in
        switch phase {
        case .empty:
          RoundedRectangle(cornerRadius: 8)
            .fill(.quaternary)
            .frame(width: 120, height: 68)
        case let .success(img):
          img
            .resizable()
            .scaledToFill()
            .frame(width: 120, height: 68)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        case .failure:
          RoundedRectangle(cornerRadius: 8)
            .fill(.quaternary)
            .frame(width: 120, height: 68)
        @unknown default:
          EmptyView()
        }
      }
      VStack(alignment: .leading, spacing: 4) {
        Text(video.title)
          .font(.subheadline.weight(.semibold))
          .lineLimit(2)
        Text(video.summaryShort)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)
        Text(video.durationLabel)
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }
    }
    .padding(.vertical, 4)
  }
}
