import SwiftUI
import WebKit

/// In-app YouTube embed. Uses a direct `embed` URL request (not HTML) with Referer + mobile Safari
/// User-Agent — more reliable in WKWebView than `loadHTMLString` for many videos.
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
    webView.navigationDelegate = context.coordinator
    context.coordinator.webView = webView
    context.coordinator.apply(videoId: videoId, startSeconds: startSeconds)
    return webView
  }

  func updateUIView(_ webView: WKWebView, context: Context) {
    context.coordinator.webView = webView
    context.coordinator.apply(videoId: videoId, startSeconds: startSeconds)
  }

  final class Coordinator: NSObject, WKNavigationDelegate {
    fileprivate weak var webView: WKWebView?
    private var lastVideoId: String?
    private var lastStart: Int?
    /// After a failed load, retry once with youtube-nocookie.com (some WKWebView / embed cases).
    private var triedNoCookieFallback = false

    func apply(videoId: String, startSeconds: Int) {
      guard let webView else { return }
      if lastVideoId == videoId, lastStart == startSeconds { return }
      lastVideoId = videoId
      lastStart = startSeconds
      triedNoCookieFallback = false

      let safeId = Self.sanitizeVideoId(videoId)
      guard !safeId.isEmpty else { return }

      let start = max(0, startSeconds)
      loadEmbed(webView: webView, host: "www.youtube.com", videoId: safeId, start: start)
    }

    private func loadEmbed(webView: WKWebView, host: String, videoId: String, start: Int) {
      var components = URLComponents(string: "https://\(host)/embed/\(videoId)")!
      components.queryItems = [
        URLQueryItem(name: "playsinline", value: "1"),
        URLQueryItem(name: "controls", value: "1"),
        URLQueryItem(name: "rel", value: "0"),
        URLQueryItem(name: "modestbranding", value: "1"),
        URLQueryItem(name: "start", value: String(start)),
        URLQueryItem(name: "enablejsapi", value: "1"),
        URLQueryItem(name: "origin", value: "https://\(host)"),
      ]
      guard let url = components.url else { return }

      var request = URLRequest(url: url)
      request.setValue("https://\(host)/", forHTTPHeaderField: "Referer")
      request.setValue(Self.mobileSafariUserAgent, forHTTPHeaderField: "User-Agent")
      webView.load(request)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
      tryNoCookieIfNeeded(webView: webView)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
      tryNoCookieIfNeeded(webView: webView)
    }

    private func tryNoCookieIfNeeded(webView: WKWebView) {
      guard !triedNoCookieFallback, let raw = lastVideoId else { return }
      let vid = Self.sanitizeVideoId(raw)
      guard !vid.isEmpty, let start = lastStart else { return }
      triedNoCookieFallback = true
      loadEmbed(webView: webView, host: "www.youtube-nocookie.com", videoId: vid, start: max(0, start))
    }

    private static let mobileSafariUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

    private static func sanitizeVideoId(_ raw: String) -> String {
      String(raw.filter { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" })
    }
  }
}
