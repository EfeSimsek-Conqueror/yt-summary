import Foundation

enum ISO8601Duration {
  /// Parses YouTube `contentDetails.duration` (e.g. `PT8M42S`, `PT1H2M3S`, `PT1H`).
  static func parseSeconds(_ iso: String) -> Int? {
    guard iso.hasPrefix("PT") else { return nil }
    var num = ""
    var h = 0
    var m = 0
    var s = 0
    for ch in iso.dropFirst(2) {
      if ch.isNumber {
        num.append(ch)
      } else if ch == "H" {
        h = Int(num) ?? 0
        num = ""
      } else if ch == "M" {
        m = Int(num) ?? 0
        num = ""
      } else if ch == "S" {
        s = Int(num) ?? 0
        num = ""
      }
    }
    return h * 3600 + m * 60 + s
  }

  static func formatLabel(_ iso: String) -> String {
    guard let sec = parseSeconds(iso) else { return "—" }
    let h = sec / 3600
    let m = (sec % 3600) / 60
    let s = sec % 60
    if h > 0 {
      return String(format: "%d:%02d:%02d", h, m, s)
    }
    return String(format: "%d:%02d", m, s)
  }
}
