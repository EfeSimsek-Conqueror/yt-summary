import SwiftUI

struct LoginView: View {
  @EnvironmentObject private var appModel: AppViewModel

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [
          Color(red: 0.05, green: 0.05, blue: 0.06),
          Color(red: 0.09, green: 0.09, blue: 0.11),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      VStack(spacing: 20) {
        RoundedRectangle(cornerRadius: 10)
          .fill(
            LinearGradient(
              colors: [.red.opacity(0.9), .red.opacity(0.5)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 56, height: 56)
        Text("VidSum")
          .font(.title.bold())
        Text("YouTube subscriptions, summaries, and analysis.")
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
          .padding(.horizontal)

        if let err = appModel.errorMessage {
          Text(err)
            .font(.caption)
            .foregroundStyle(.red.opacity(0.9))
            .multilineTextAlignment(.center)
            .padding(.horizontal)
        }

        Button {
          Task { await appModel.signInWithGoogle() }
        } label: {
          if appModel.isSigningIn {
            ProgressView()
              .tint(.primary)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 12)
          } else {
            Text("Sign in with Google")
              .fontWeight(.semibold)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 12)
          }
        }
        .buttonStyle(.borderedProminent)
        .disabled(appModel.isSigningIn)
        .padding(.horizontal, 32)
        .padding(.top, 8)
      }
    }
  }
}

#Preview {
  LoginView()
    .environmentObject(AppViewModel())
}
