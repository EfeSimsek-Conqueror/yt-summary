import SwiftUI
import WebKit

/// In-app YouTube embed. Loads an HTML iframe with a proper `baseURL` and `origin` so WKWebView
/// does not hit YouTube **Error 153** (video player configuration error) when loading `embed` URLs directly.
struct YouTubeWebPlayerView: UIViewRepresentable {
  let videoId: String
  var startSeconds: Int

  func makeCoordinator() -> Coordinator {
    Coordinator()
  }

  func makeUIView(context: Context) -> WKWebView {
    let config = WKWebViewConfiguration()
    config.allowsInlineMediaPlayback = true
    config.mediaTypesRequiringUserActionForPlayback = []
    if #available(iOS 15.0, *) {
      let pagePrefs = WKWebpagePreferences()
      pagePrefs.allowsContentJavaScript = true
      config.defaultWebpagePreferences = pagePrefs
    }

    let webView = WKWebView(frame: .zero, configuration: config)
    webView.isOpaque = false
    webView.backgroundColor = .black
    webView.scrollView.isScrollEnabled = false
    webView.scrollView.bounces = false
    context.coordinator.webView = webView
    context.coordinator.apply(videoId: videoId, startSeconds: startSeconds)
    return webView
  }

  func updateUIView(_ webView: WKWebView, context: Context) {
    context.coordinator.webView = webView
    context.coordinator.apply(videoId: videoId, startSeconds: startSeconds)
  }

  final class Coordinator: NSObject {
    fileprivate weak var webView: WKWebView?
    private var lastVideoId: String?
    private var lastStart: Int?

    func apply(videoId: String, startSeconds: Int) {
      guard let webView else { return }
      if lastVideoId == videoId, lastStart == startSeconds { return }
      lastVideoId = videoId
      lastStart = startSeconds

      let safeId = Self.sanitizeVideoId(videoId)
      guard !safeId.isEmpty else { return }

      let start = max(0, startSeconds)
      // `origin` + `playsinline` + `enablejsapi` help the embedded player in WKWebView.
      var embedComponents = URLComponents(
        string: "https://www.youtube.com/embed/\(safeId)"
      )!
      embedComponents.queryItems = [
        URLQueryItem(name: "playsinline", value: "1"),
        URLQueryItem(name: "controls", value: "1"),
        URLQueryItem(name: "rel", value: "0"),
        URLQueryItem(name: "modestbranding", value: "1"),
        URLQueryItem(name: "start", value: String(start)),
        URLQueryItem(name: "enablejsapi", value: "1"),
        URLQueryItem(name: "origin", value: "https://www.youtube.com"),
      ]
      guard let embedURL = embedComponents.url?.absoluteString else { return }

      // HTML attribute must escape '&' as '&amp;'
      let srcEscaped = embedURL.replacingOccurrences(of: "&", with: "&amp;")

      let html = """
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          html, body { margin:0; padding:0; background:#000; height:100%; }
          iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:0; }
        </style>
      </head>
      <body>
        <iframe
          src="\(srcEscaped)"
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </body>
      </html>
      """

      webView.loadHTMLString(html, baseURL: URL(string: "https://www.youtube.com")!)
    }

    private static func sanitizeVideoId(_ raw: String) -> String {
      String(raw.filter { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" })
    }
  }
}
