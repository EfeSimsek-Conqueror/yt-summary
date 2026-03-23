import Foundation

enum YouTubeService {
  private static let apiBase = URL(string: "https://www.googleapis.com/youtube/v3")!

  enum ServiceError: LocalizedError {
    case http(Int, String)
    case decoding

    var errorDescription: String? {
      switch self {
      case let .http(code, body):
        return "YouTube API (\(code)): \(body)"
      case .decoding:
        return "Could not parse YouTube response."
      }
    }
  }

  static func fetchSubscriptions(accessToken: String) async throws -> [YTChannel] {
    var channels: [YTChannel] = []
    var pageToken: String?

    repeat {
      var components = URLComponents(
        url: apiBase.appendingPathComponent("subscriptions"),
        resolvingAgainstBaseURL: false
      )!
      var items: [URLQueryItem] = [
        .init(name: "part", value: "snippet"),
        .init(name: "mine", value: "true"),
        .init(name: "maxResults", value: "50"),
      ]
      if let pageToken {
        items.append(.init(name: "pageToken", value: pageToken))
      }
      components.queryItems = items

      let (data, response) = try await dataRequest(url: components.url!, accessToken: accessToken)
      try throwIfNeeded(response, data: data)

      let decoded = try JSONDecoder().decode(SubscriptionsResponse.self, from: data)
      for item in decoded.items ?? [] {
        guard let id = item.snippet?.resourceId?.channelId,
              let title = item.snippet?.title
        else { continue }
        let thumb = item.snippet?.thumbnails?.default?.url.flatMap(URL.init(string:))
        channels.append(YTChannel(id: id, title: title, thumbnailURL: thumb))
      }
      pageToken = decoded.nextPageToken
    } while pageToken != nil

    return channels
  }

  static func fetchChannelUploads(
    accessToken: String,
    channelId: String,
    maxResults: Int = 24
  ) async throws -> [YTVideo] {
    var ch = URLComponents(
      url: apiBase.appendingPathComponent("channels"),
      resolvingAgainstBaseURL: false
    )!
    ch.queryItems = [
      .init(name: "part", value: "contentDetails"),
      .init(name: "id", value: channelId),
    ]

    let (chData, chRes) = try await dataRequest(url: ch.url!, accessToken: accessToken)
    try throwIfNeeded(chRes, data: chData)
    let chDecoded = try JSONDecoder().decode(ChannelsListResponse.self, from: chData)
    guard let uploadsPlaylistId = chDecoded.items?.first?.contentDetails?.relatedPlaylists?.uploads else {
      return []
    }

    var pl = URLComponents(
      url: apiBase.appendingPathComponent("playlistItems"),
      resolvingAgainstBaseURL: false
    )!
    pl.queryItems = [
      .init(name: "part", value: "snippet,contentDetails"),
      .init(name: "playlistId", value: uploadsPlaylistId),
      .init(name: "maxResults", value: String(min(maxResults, 50))),
    ]

    let (plData, plRes) = try await dataRequest(url: pl.url!, accessToken: accessToken)
    try throwIfNeeded(plRes, data: plData)
    let plDecoded = try JSONDecoder().decode(PlaylistItemsResponse.self, from: plData)

    var ids: [String] = []
    var snippetById: [String: (title: String, description: String, thumb: URL?)] = [:]

    for row in plDecoded.items ?? [] {
      guard let vid = row.snippet?.resourceId?.videoId else { continue }
      ids.append(vid)
      snippetById[vid] = (
        title: row.snippet?.title ?? "Untitled",
        description: row.snippet?.description ?? "",
        thumb: (row.snippet?.thumbnails?.high?.url ?? row.snippet?.thumbnails?.medium?.url)
          .flatMap(URL.init(string:))
      )
    }

    if ids.isEmpty { return [] }

    var videos: [YTVideo] = []
    for chunk in stride(from: 0, to: ids.count, by: 50) {
      let batch = Array(ids[chunk ..< min(chunk + 50, ids.count)])
      var vurl = URLComponents(
        url: apiBase.appendingPathComponent("videos"),
        resolvingAgainstBaseURL: false
      )!
      vurl.queryItems = [
        .init(name: "part", value: "snippet,contentDetails"),
        .init(name: "id", value: batch.joined(separator: ",")),
      ]

      let (vData, vRes) = try await dataRequest(url: vurl.url!, accessToken: accessToken)
      try throwIfNeeded(vRes, data: vData)
      let vDecoded = try JSONDecoder().decode(VideosListResponse.self, from: vData)

      for item in vDecoded.items ?? [] {
        guard let vid = item.id else { continue }
        let sn = snippetById[vid]
        let title = item.snippet?.title ?? sn?.title ?? "Untitled"
        let desc = item.snippet?.description ?? sn?.description ?? ""
        let durationIso = item.contentDetails?.duration ?? "PT0S"
        let durationSec = ISO8601Duration.parseSeconds(durationIso) ?? 0
        let summary =
          desc.trimmingCharacters(in: .whitespacesAndNewlines).prefix(160)
        let summaryStr =
          summary.isEmpty
          ? "Open for details. Transcript & analysis use the web app when connected."
          : String(summary)

        videos.append(
          YTVideo(
            id: vid,
            channelId: channelId,
            title: title,
            durationLabel: ISO8601Duration.formatLabel(durationIso),
            durationSeconds: durationSec,
            summaryShort: summaryStr,
            thumbnailURL: sn?.thumb
          )
        )
      }
    }

    let order = Dictionary(uniqueKeysWithValues: ids.enumerated().map { ($0.element, $0.offset) })
    videos.sort { (order[$0.id] ?? 0) < (order[$1.id] ?? 0) }

    return videos
  }

  /// Global YouTube video search (`search.list`). Requires `youtube.readonly` scope.
  static func searchVideos(accessToken: String, query: String) async throws -> [YTVideo] {
    let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
    guard q.count >= 2 else { return [] }

    var components = URLComponents(
      url: apiBase.appendingPathComponent("search"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [
      .init(name: "part", value: "snippet"),
      .init(name: "type", value: "video"),
      .init(name: "q", value: q),
      .init(name: "maxResults", value: "25"),
    ]

    let (data, response) = try await dataRequest(url: components.url!, accessToken: accessToken)
    try throwIfNeeded(response, data: data)

    let decoded = try JSONDecoder().decode(SearchListResponse.self, from: data)
    var ids: [String] = []
    for item in decoded.items ?? [] {
      guard let vid = item.id?.videoId else { continue }
      ids.append(vid)
    }
    if ids.isEmpty { return [] }

    var videos: [YTVideo] = []
    for chunk in stride(from: 0, to: ids.count, by: 50) {
      let batch = Array(ids[chunk ..< min(chunk + 50, ids.count)])
      var vurl = URLComponents(
        url: apiBase.appendingPathComponent("videos"),
        resolvingAgainstBaseURL: false
      )!
      vurl.queryItems = [
        .init(name: "part", value: "snippet,contentDetails"),
        .init(name: "id", value: batch.joined(separator: ",")),
      ]

      let (vData, vRes) = try await dataRequest(url: vurl.url!, accessToken: accessToken)
      try throwIfNeeded(vRes, data: vData)
      let vDecoded = try JSONDecoder().decode(VideosListResponse.self, from: vData)

      for item in vDecoded.items ?? [] {
        guard let vid = item.id else { continue }
        let title = item.snippet?.title ?? "Untitled"
        let desc = item.snippet?.description ?? ""
        let channelId = item.snippet?.channelId ?? ""
        let durationIso = item.contentDetails?.duration ?? "PT0S"
        let durationSec = ISO8601Duration.parseSeconds(durationIso) ?? 0
        let summary =
          desc.trimmingCharacters(in: .whitespacesAndNewlines).prefix(160)
        let summaryStr =
          summary.isEmpty
          ? "Open for details. Full analysis in the web app when connected."
          : String(summary)
        let thumb =
          (item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url)
          .flatMap(URL.init(string:))

        videos.append(
          YTVideo(
            id: vid,
            channelId: channelId,
            title: title,
            durationLabel: ISO8601Duration.formatLabel(durationIso),
            durationSeconds: durationSec,
            summaryShort: summaryStr,
            thumbnailURL: thumb
          )
        )
      }
    }

    let order = Dictionary(uniqueKeysWithValues: ids.enumerated().map { ($0.element, $0.offset) })
    videos.sort { (order[$0.id] ?? 0) < (order[$1.id] ?? 0) }

    return videos
  }

  private static func dataRequest(url: URL, accessToken: String) async throws -> (Data, URLResponse) {
    var req = URLRequest(url: url)
    req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    req.setValue("application/json", forHTTPHeaderField: "Accept")
    return try await URLSession.shared.data(for: req)
  }

  private static func throwIfNeeded(_ response: URLResponse, data: Data) throws {
    guard let http = response as? HTTPURLResponse else { return }
    guard (200 ... 299).contains(http.statusCode) else {
      let body = String(data: data, encoding: .utf8) ?? ""
      throw ServiceError.http(http.statusCode, body)
    }
  }
}

// MARK: - JSON

private struct SubscriptionsResponse: Decodable {
  let items: [SubItem]?
  let nextPageToken: String?
}

private struct SubItem: Decodable {
  let snippet: SubSnippet?
}

private struct SubSnippet: Decodable {
  let title: String?
  let resourceId: ResourceId?
  let thumbnails: ThumbWrap?
}

private struct ResourceId: Decodable {
  let channelId: String?
}

private struct ThumbWrap: Decodable {
  let `default`: ThumbURL?
}

private struct ThumbURL: Decodable {
  let url: String?
}

private struct ChannelsListResponse: Decodable {
  let items: [ChannelItem]?
}

private struct ChannelItem: Decodable {
  let contentDetails: ContentDetails?
}

private struct ContentDetails: Decodable {
  let relatedPlaylists: RelatedPlaylists?
}

private struct RelatedPlaylists: Decodable {
  let uploads: String?
}

private struct PlaylistItemsResponse: Decodable {
  let items: [PlaylistRow]?
}

private struct PlaylistRow: Decodable {
  let snippet: PlaylistSnippet?
}

private struct PlaylistSnippet: Decodable {
  let title: String?
  let description: String?
  let channelId: String?
  let resourceId: VideoResourceId?
  let thumbnails: VideoThumbs?
}

private struct SearchListResponse: Decodable {
  let items: [SearchItem]?
}

private struct SearchItem: Decodable {
  let id: SearchIdEnvelope?
  let snippet: PlaylistSnippet?
}

private struct SearchIdEnvelope: Decodable {
  let kind: String?
  let videoId: String?
}

private struct VideoResourceId: Decodable {
  let videoId: String?
}

private struct VideoThumbs: Decodable {
  let high: ThumbURL?
  let medium: ThumbURL?
}

private struct VideosListResponse: Decodable {
  let items: [VideoItem]?
}

private struct VideoItem: Decodable {
  let id: String?
  let snippet: PlaylistSnippet?
  let contentDetails: VideoContentDetails?
}

private struct VideoContentDetails: Decodable {
  let duration: String?
}
