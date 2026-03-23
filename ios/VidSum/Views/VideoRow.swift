import SwiftUI

struct VideoRow: View {
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
