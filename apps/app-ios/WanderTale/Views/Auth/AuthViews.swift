import SwiftUI

enum AuthFocusField: Hashable {
    case email, password, name
}

struct LoginView: View {
    @Environment(AppState.self) private var appState
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var loading = false
    @State private var googleLoading = false
    @State private var facebookLoading = false
    @State private var showRegister = false
    @State private var showForgot = false
    @FocusState private var focusedField: AuthFocusField?

    var body: some View {
        NavigationStack {
            ZStack {
                AuthBackgroundView()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 20) {
                        AuthFormShell(
                            kicker: "Tài khoản",
                            title: "Đăng nhập",
                            description: "Tiếp tục hành trình — lịch trình và chuyến đi của bạn đang chờ."
                        ) {
                            AuthTextField(
                                label: "Email",
                                text: $email,
                                placeholder: "ban@email.com",
                                keyboard: .emailAddress,
                                textContentType: .emailAddress,
                                submitLabel: .next,
                                focus: $focusedField,
                                focusTag: .email
                            ) {
                                focusedField = .password
                            }

                            AuthTextField(
                                label: "Mật khẩu",
                                text: $password,
                                placeholder: "••••••••",
                                secure: true,
                                textContentType: .password,
                                submitLabel: .go,
                                focus: $focusedField,
                                focusTag: .password
                            ) {
                                Task { await submit() }
                            }

                            if let error {
                                Text(error)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color(red: 1, green: 0.56, blue: 0.66))
                                    .fixedSize(horizontal: false, vertical: true)
                            }

                            AuthAccentButton(
                                title: loading ? "Đang xử lý…" : "Đăng nhập",
                                loading: loading,
                                enabled: !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty
                            ) {
                                Task { await submit() }
                            }

                            authDivider
                            GoogleSignInButton(loading: googleLoading) {
                                Task { await submitGoogle() }
                            }
                            FacebookSignInButton(loading: facebookLoading) {
                                Task { await submitFacebook() }
                            }
                        }
                        authFooterLinks
                    }
                    .padding(.horizontal, PremiumTheme.screenPadding)
                    .padding(.vertical, 24)
                    .frame(maxWidth: .infinity)
                }
                .scrollDismissesKeyboard(.interactively)
                .safeAreaInset(edge: .top, spacing: 0) {
                    heroHeader
                }
            }
            .navigationDestination(isPresented: $showRegister) { RegisterView() }
            .navigationDestination(isPresented: $showForgot) { ForgotPasswordView() }
        }
    }

    private var heroHeader: some View {
        VStack(spacing: 10) {
            Image("logo10")
                .resizable()
                .scaledToFit()
                .frame(width: 156, height: 96)
                .shadow(color: .black.opacity(0.28), radius: 10, y: 4)
            VStack(spacing: 2) {
                Text("Mỗi chuyến đi,")
                Text("một câu chuyện riêng.")
            }
            .font(.system(size: 20, weight: .medium))
            .foregroundStyle(.white)
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, PremiumTheme.screenPadding)
        .padding(.top, 18)
        .padding(.bottom, 14)
    }

    private var authDivider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Color.white.opacity(0.25)).frame(height: 1)
            Text("hoặc").font(.system(size: 13)).foregroundStyle(.white.opacity(0.6))
            Rectangle().fill(Color.white.opacity(0.25)).frame(height: 1)
        }
        .padding(.vertical, 2)
    }

    private var authFooterLinks: some View {
        HStack(spacing: 8) {
            Button("Quên mật khẩu?") { showForgot = true }
            Text("·").foregroundStyle(.white.opacity(0.45))
            Button("Tạo tài khoản mới") { showRegister = true }
        }
        .font(.system(size: 14, weight: .medium))
        .foregroundStyle(PremiumTheme.accentEnd)
        .frame(maxWidth: .infinity)
    }

    private func submit() async {
        focusedField = nil
        loading = true
        error = nil
        do {
            try await appState.signIn(
                email: email.trimmingCharacters(in: .whitespaces),
                password: password
            )
        } catch {
            self.error = formatAuthError(error, fallback: "Đăng nhập thất bại")
        }
        loading = false
    }

    private func submitGoogle() async {
        focusedField = nil
        googleLoading = true
        error = nil
        do {
            try await appState.signInWithGoogle()
        } catch {
            let nsError = error as NSError
            // Người dùng tự đóng/huỷ phiên web — không hiện lỗi.
            if !(nsError.domain == "com.apple.AuthenticationServices.WebAuthenticationSession") {
                self.error = formatAuthError(error, fallback: "Đăng nhập Google thất bại")
            }
        }
        googleLoading = false
    }

    private func submitFacebook() async {
        focusedField = nil
        facebookLoading = true
        error = nil
        do {
            try await appState.signInWithFacebook()
        } catch {
            let nsError = error as NSError
            if !(nsError.domain == "com.apple.AuthenticationServices.WebAuthenticationSession") {
                self.error = formatAuthError(error, fallback: "Đăng nhập Facebook thất bại")
            }
        }
        facebookLoading = false
    }
}

struct RegisterView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var loading = false

    var body: some View {
        ZStack {
            AuthBackgroundView()
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    AuthFormShell(
                        kicker: "Bắt đầu",
                        title: "Đăng ký",
                        description: "Tạo tài khoản WanderTale — đồng bộ chuyến đi trên mọi thiết bị."
                    ) {
                        AuthTextField(label: "Tên hiển thị", text: $name, placeholder: "Tên của bạn")
                        AuthTextField(label: "Email", text: $email, placeholder: "ban@email.com", keyboard: .emailAddress, textContentType: .emailAddress)
                        AuthTextField(label: "Mật khẩu", text: $password, placeholder: "••••••••", secure: true, textContentType: .newPassword)
                        if let error {
                            Text(error).font(.system(size: 13)).foregroundStyle(Color(red: 1, green: 0.56, blue: 0.66))
                        }
                        AuthAccentButton(title: loading ? "Đang xử lý…" : "Đăng ký", loading: loading) {
                            Task { await submit() }
                        }
                    }
                    Button("Đã có tài khoản? Đăng nhập") { dismiss() }
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(PremiumTheme.accentEnd)
                }
                .padding(.horizontal, PremiumTheme.screenPadding)
                .padding(.vertical, 20)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit() async {
        loading = true
        error = nil
        do {
            try await appState.signUp(
                email: email.trimmingCharacters(in: .whitespaces),
                password: password,
                displayName: name
            )
            dismiss()
        } catch {
            self.error = formatAuthError(error, fallback: "Đăng ký thất bại")
        }
        loading = false
    }
}

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var message: String?
    @State private var error: String?
    @State private var loading = false

    var body: some View {
        ZStack {
            AuthBackgroundView()
            ScrollView(.vertical, showsIndicators: false) {
                AuthFormShell(
                    kicker: "Tài khoản",
                    title: "Quên mật khẩu",
                    description: "Nhập email để nhận liên kết đặt lại mật khẩu."
                ) {
                    AuthTextField(label: "Email", text: $email, placeholder: "ban@email.com", keyboard: .emailAddress, textContentType: .emailAddress)
                    if let error {
                        Text(error).font(.system(size: 13)).foregroundStyle(Color(red: 1, green: 0.56, blue: 0.66))
                    }
                    if let message {
                        Text(message).font(.system(size: 13)).foregroundStyle(PremiumTheme.statDestIcon)
                    }
                    AuthAccentButton(title: "Gửi email", loading: loading) {
                        Task {
                            loading = true
                            do {
                                try await SupabaseClient.resetPassword(email: email.trimmingCharacters(in: .whitespaces))
                                message = "Đã gửi email (nếu tài khoản tồn tại)."
                                error = nil
                            } catch let err {
                                error = formatAuthError(err, fallback: "Không gửi được email")
                            }
                            loading = false
                        }
                    }
                }
                .padding(.horizontal, PremiumTheme.screenPadding)
                .padding(.vertical, 20)
                .frame(maxWidth: .infinity)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Form card (Android: dark glass, full width trong padding màn hình)

struct AuthFormShell<Content: View>: View {
    let kicker: String
    let title: String
    let description: String
    @ViewBuilder var content: Content

    init(
        kicker: String,
        title: String,
        description: String,
        @ViewBuilder content: () -> Content
    ) {
        self.kicker = kicker
        self.title = title
        self.description = description
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text(kicker.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(PremiumTheme.accentEnd)
                    .tracking(0.6)
                Text(title)
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(.white)
                Text(description)
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.68))
                    .lineSpacing(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 16)

            Rectangle()
                .fill(Color.white.opacity(0.14))
                .frame(height: 1)
                .padding(.bottom, 16)

            VStack(alignment: .leading, spacing: 16) {
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(red: 0.08, green: 0.08, blue: 0.09).opacity(0.88))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.16), lineWidth: 1)
                .allowsHitTesting(false)
        }
        .shadow(color: .black.opacity(0.2), radius: 12, y: 6)
    }
}

// MARK: - Input fields

struct AuthTextField: View {
    let label: String
    @Binding var text: String
    var placeholder = ""
    var secure = false
    var keyboard: UIKeyboardType = .default
    var textContentType: UITextContentType?
    var submitLabel: SubmitLabel = .done
    var focus: FocusState<AuthFocusField?>.Binding?
    var focusTag: AuthFocusField?
    var onSubmit: (() -> Void)?

    private var isFocused: Bool {
        guard let focus, let focusTag else { return false }
        return focus.wrappedValue == focusTag
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.55))
                .tracking(0.6)

            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(isFocused ? 0.16 : 0.10))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color.white.opacity(isFocused ? 0.42 : 0.22), lineWidth: 1)
                    }
                    .frame(height: 48)
                    .allowsHitTesting(false)

                field
                    .font(.system(size: 15))
                    .foregroundStyle(.white)
                    .tint(PremiumTheme.accentEnd)
                    .padding(.horizontal, 14)
                    .frame(height: 48)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var field: some View {
        let prompt = Text(placeholder).foregroundStyle(Color.white.opacity(0.38))
        if secure {
            let input = SecureField("", text: $text, prompt: prompt)
                .textContentType(textContentType)
                .submitLabel(submitLabel)
                .onSubmit { onSubmit?() }
            if let focus, let focusTag {
                input.focused(focus, equals: focusTag)
            } else {
                input
            }
        } else {
            let input = TextField("", text: $text, prompt: prompt)
                .keyboardType(keyboard)
                .textContentType(textContentType)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
                .autocorrectionDisabled(keyboard == .emailAddress)
                .submitLabel(submitLabel)
                .onSubmit { onSubmit?() }
            if let focus, let focusTag {
                input.focused(focus, equals: focusTag)
            } else {
                input
            }
        }
    }
}

struct AuthAccentButton: View {
    let title: String
    var loading = false
    var enabled = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if loading {
                    ProgressView().tint(.white)
                } else {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(.white)
            .background(
                LinearGradient(
                    colors: [PremiumTheme.accent, PremiumTheme.accentEnd],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .opacity(enabled && !loading ? 1 : 0.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .disabled(!enabled || loading)
    }
}

struct GoogleSignInButton: View {
    var loading = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if loading {
                    ProgressView().tint(Color(red: 0.26, green: 0.52, blue: 0.96))
                } else {
                    Image("GoogleLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 18, height: 18)
                    Text("Đăng nhập bằng Google")
                        .font(.system(size: 15, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(Color(red: 0.13, green: 0.13, blue: 0.13))
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.black.opacity(0.12), lineWidth: 1)
            )
        }
        .disabled(loading)
    }
}

struct FacebookSignInButton: View {
    var loading = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if loading {
                    ProgressView().tint(.white)
                } else {
                    Text("f")
                        .font(.system(size: 20, weight: .bold, design: .serif))
                        .foregroundStyle(.white)
                    Text("Đăng nhập bằng Facebook")
                        .font(.system(size: 15, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(.white)
            .background(Color(red: 0.10, green: 0.34, blue: 0.65))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .disabled(loading)
    }
}
