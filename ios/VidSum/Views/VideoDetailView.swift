import SwiftUI

struct VideoDetailView: View {
  let video: YTVideo

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        AsyncImage(url: video.thumbnailURL) { phase in
          switch phase {
          case .empty:
            RoundedRectangle(cornerRadius: 12)
              .fill(.quaternary)
              .frame(height: 200)
          case let .success(img):
            img
              .resizable()
              .scaledToFill()
              .frame(maxHeight: 220)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          case .failure:
            RoundedRectangle(cornerRadius: 12)
              .fill(.quaternary)
              .frame(height: 200)
          @unknown default:
            EmptyView()
          }
        }

        Text(video.title)
          .font(.title.bold())

        HStack {
          Label(video.durationLabel, systemImage: "clock")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Spacer()
        }

        Text(video.summaryShort)
          .font(.body)

        Text(
          "Transcript loading, segment summaries, and AI analysis run in the web app today. Open the same video on your deployed site for the full workflow."
        )
        .font(.footnote)
        .foregroundStyle(.secondary)
      }
      .padding()
    }
    .navigationTitle("Video")
    .navigationBarTitleDisplayMode(.inline)
  }
}
