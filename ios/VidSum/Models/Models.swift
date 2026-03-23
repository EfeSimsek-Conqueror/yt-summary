import Foundation

struct YTChannel: Identifiable, Hashable {
  let id: String
  let title: String
  let thumbnailURL: URL?
}

struct YTVideo: Identifiable, Hashable {
  let id: String
  let channelId: String
  let title: String
  let durationLabel: String
  let summaryShort: String
  let thumbnailURL: URL?
}
