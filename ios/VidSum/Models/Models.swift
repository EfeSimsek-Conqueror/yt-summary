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
  /// Total length in seconds (from YouTube `contentDetails.duration`).
  let durationSeconds: Int
  let summaryShort: String
  let thumbnailURL: URL?
}

/// “Important minutes” row for the video detail UI (placeholder quarters until API matches web).
struct VideoMoment: Identifiable, Hashable {
  let id: Int
  let title: String
  let startSeconds: Int
  let endSeconds: Int
  let bullets: [String]
}

enum VideoMomentGenerator {
  /// Splits the timeline into up to four segments so users can jump (same idea as web segments).
  static func placeholderMoments(durationSeconds: Int, summarySnippet: String) -> [VideoMoment] {
    let total = max(durationSeconds, 1)
    let parts = 4
    var rows: [VideoMoment] = []
    for i in 0 ..< parts {
      let start = total * i / parts
      let end = i == parts - 1 ? total : total * (i + 1) / parts
      let bullets: [String]
      if i == 0, !summarySnippet.isEmpty {
        bullets = [String(summarySnippet.prefix(120))]
      } else {
        bullets = ["\(formatClock(start)) – \(formatClock(end)) aralığına atla."]
      }
      rows.append(
        VideoMoment(
          id: i,
          title: "Bölüm \(i + 1)",
          startSeconds: start,
          endSeconds: end,
          bullets: bullets
        )
      )
    }
    return rows
  }

  private static func formatClock(_ sec: Int) -> String {
    let m = sec / 60
    let s = sec % 60
    return String(format: "%d:%02d", m, s)
  }
}
