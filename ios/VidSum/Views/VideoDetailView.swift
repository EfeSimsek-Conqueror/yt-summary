import SwiftUI

struct VideoDetailView: View {
  let video: YTVideo

  @State private var embedStartSeconds = 0
  @State private var sidePanelOpen = true

  private var moments: [VideoMoment] {
    VideoMomentGenerator.placeholderMoments(
      durationSeconds: video.durationSeconds,
      summarySnippet: video.summaryShort
    )
  }

  var body: some View {
    GeometryReader { geo in
      let landscape = geo.size.width > geo.size.height
      Group {
        if landscape {
          landscapeLayout(width: geo.size.width, height: geo.size.height)
        } else {
          portraitLayout
        }
      }
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("Video")
    .navigationBarTitleDisplayMode(.inline)
  }

  private var portraitLayout: some View {
    VStack(spacing: 0) {
      playerChrome
        .frame(maxWidth: .infinity)
        .aspectRatio(16 / 9, contentMode: .fit)
        .background(Color.black)

      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          metaBlock
          momentsBlock
        }
        .padding()
      }
    }
  }

  private func landscapeLayout(width: CGFloat, height: CGFloat) -> some View {
    HStack(spacing: 0) {
      playerChrome
        .frame(
          width: sidePanelOpen ? width * 0.58 : width - 48,
          height: height
        )
        .background(Color.black)

      if sidePanelOpen {
        momentsSidePanel
          .frame(width: max(width * 0.42, 0), height: height)
          .background(Color(.secondarySystemGroupedBackground))
      } else {
        VStack {
          Button {
            sidePanelOpen = true
          } label: {
            Image(systemName: "sidebar.left")
              .font(.title3.weight(.semibold))
              .padding(.vertical, 12)
          }
          .accessibilityLabel("Open key moments panel")
          Spacer()
        }
        .frame(width: 48)
        .frame(maxHeight: .infinity)
        .background(Color(.secondarySystemGroupedBackground))
      }
    }
  }

  private var playerChrome: some View {
    YouTubeWebPlayerView(videoId: video.id, startSeconds: embedStartSeconds)
  }

  private var metaBlock: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(video.title)
        .font(.title3.bold())
        .foregroundStyle(.primary)

      Label(video.durationLabel, systemImage: "clock")
        .font(.subheadline)
        .foregroundStyle(.secondary)

      Text(video.summaryShort)
        .font(.body)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var momentsBlock: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Key moments")
        .font(.headline)
      ForEach(moments) { moment in
        momentRow(moment)
      }
    }
  }

  private var momentsSidePanel: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack {
        Text("Key moments")
          .font(.headline)
        Spacer()
        Button {
          sidePanelOpen = false
        } label: {
          Image(systemName: "xmark.circle.fill")
            .symbolRenderingMode(.hierarchical)
            .foregroundStyle(.secondary)
        }
        .accessibilityLabel("Close panel")
      }
      .padding(.horizontal)
      .padding(.top, 12)
      .padding(.bottom, 8)

      ScrollView {
        LazyVStack(alignment: .leading, spacing: 10) {
          ForEach(moments) { moment in
            momentRow(moment)
          }
        }
        .padding(.horizontal)
        .padding(.bottom, 16)
      }
    }
  }

  private func momentRow(_ moment: VideoMoment) -> some View {
    Button {
      embedStartSeconds = moment.startSeconds
    } label: {
      VStack(alignment: .leading, spacing: 6) {
        HStack {
          Text(moment.title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.primary)
          Spacer()
          Text(formatClock(moment.startSeconds))
            .font(.caption.monospacedDigit())
            .foregroundStyle(.tertiary)
        }
        ForEach(Array(moment.bullets.enumerated()), id: \.offset) { _, line in
          Text(line)
            .font(.caption)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.leading)
        }
      }
      .padding(12)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .fill(Color(.tertiarySystemGroupedBackground))
      )
    }
    .buttonStyle(.plain)
  }

  private func formatClock(_ sec: Int) -> String {
    let m = sec / 60
    let s = sec % 60
    return String(format: "%d:%02d", m, s)
  }
}
