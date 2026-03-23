import SwiftUI
import WebKit

/// In-app YouTube embed (web parity). Seeking reloads the embed with `start=` (seconds).
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
      let start = max(0, startSeconds)
      let url = URL(
        string:
          "https://www.youtube.com/embed/\(videoId)?playsinline=1&rel=0&modestbranding=1&start=\(start)"
      )!
      webView.load(URLRequest(url: url))
    }
  }
}
