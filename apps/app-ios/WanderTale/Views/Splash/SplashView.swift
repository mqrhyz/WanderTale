import SwiftUI

struct SplashView: View {
    @State private var portalProgress: CGFloat = 0
    @State private var portalGlow: CGFloat = 0
    @State private var logoReveal: CGFloat = 0
    @State private var planeProgress: CGFloat = 0

    /// Android dùng 0.82 — iOS to hơn một chút theo yêu cầu.
    private let logoWidthFraction: CGFloat = 0.86
    private let logoAspect: CGFloat = 1536 / 1024

    private let portalSoft = Color(red: 1, green: 0.94, blue: 0.91)
    private let portalGold = Color(red: 1, green: 0.784, blue: 0.341)
    private let portalOrange = PremiumTheme.accent

    var body: some View {
        GeometryReader { geo in
            let radius = max(geo.size.width, geo.size.height) * 0.9
            let logoWidth = geo.size.width * logoWidthFraction
            let logoHeight = logoWidth / logoAspect

            ZStack {
                RadialGradient(
                    colors: [
                        Color(red: 1, green: 0.988, blue: 0.98),
                        PremiumTheme.bg,
                        Color(red: 0.956, green: 0.941, blue: 0.922),
                    ],
                    center: .center,
                    startRadius: 0,
                    endRadius: radius
                )
                .ignoresSafeArea()

                ZStack {
                    SplashSwooshCanvas(
                        portalProgress: portalProgress,
                        portalGlow: portalGlow,
                        planeProgress: planeProgress,
                        portalSoft: portalSoft,
                        portalGold: portalGold,
                        portalOrange: portalOrange
                    )
                    .frame(width: logoWidth, height: logoHeight)

                    Image("logo10")
                        .resizable()
                        .scaledToFit()
                        .frame(width: logoWidth)
                        .opacity(logoReveal)
                        .scaleEffect(0.94 + logoReveal * 0.06)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
        .onAppear(perform: startAnimations)
    }

    private func startAnimations() {
        withAnimation(.easeInOut(duration: 0.48)) {
            portalProgress = 1
        }
        withAnimation(.easeOut(duration: 0.32).delay(0.28)) {
            portalGlow = 0.45
        }
        withAnimation(.easeOut(duration: 0.42).delay(0.36)) {
            logoReveal = 1
        }
        withAnimation(.linear(duration: 0.18).delay(0.72)) {
            planeProgress = 1
        }
    }
}

private struct SplashSwooshCanvas: View {
    let portalProgress: CGFloat
    let portalGlow: CGFloat
    let planeProgress: CGFloat
    let portalSoft: Color
    let portalGold: Color
    let portalOrange: Color

    var body: some View {
        Canvas { context, size in
            let start = CGPoint(x: size.width * 0.10, y: size.height * 0.58)
            let control = CGPoint(x: size.width * 0.50, y: size.height * 0.72)
            let end = CGPoint(x: size.width * 0.93, y: size.height * 0.38)

            var swoosh = Path()
            swoosh.move(to: start)
            swoosh.addQuadCurve(to: end, control: control)

            if portalProgress > 0 {
                context.stroke(
                    swoosh.trimmedPath(from: 0, to: portalProgress),
                    with: .linearGradient(
                        Gradient(colors: [portalSoft, portalGold, portalOrange]),
                        startPoint: CGPoint(x: 0, y: size.height * 0.6),
                        endPoint: CGPoint(x: size.width, y: size.height * 0.4)
                    ),
                    style: StrokeStyle(lineWidth: 2.8, lineCap: .round, lineJoin: .round)
                )

                if portalGlow > 0 {
                    let t = min(max(portalProgress, 0.05), 1)
                    let glowCenter = quadPoint(t: t, start: start, control: control, end: end)
                    let glowRadius = min(size.width, size.height) * 0.22
                    let glowRect = CGRect(
                        x: glowCenter.x - glowRadius,
                        y: glowCenter.y - glowRadius,
                        width: glowRadius * 2,
                        height: glowRadius * 2
                    )
                    context.fill(
                        Path(ellipseIn: glowRect),
                        with: .radialGradient(
                            Gradient(colors: [
                                portalGold.opacity(portalGlow * 0.28),
                                portalSoft.opacity(portalGlow * 0.10),
                                .clear,
                            ]),
                            center: glowCenter,
                            startRadius: 0,
                            endRadius: glowRadius
                        )
                    )
                }
            }

            if planeProgress > 0 {
                let planeCenter = quadPoint(t: planeProgress, start: start, control: control, end: end)
                let angle = quadTangentAngle(t: planeProgress, start: start, control: control, end: end)

                var planeContext = context
                planeContext.translateBy(x: planeCenter.x, y: planeCenter.y)
                planeContext.rotate(by: .radians(angle))

                var plane = Path()
                plane.move(to: CGPoint(x: -6, y: 1.5))
                plane.addLine(to: CGPoint(x: 9, y: -1))
                plane.addLine(to: CGPoint(x: 1.5, y: 0))
                plane.addLine(to: CGPoint(x: 9, y: 1))
                plane.closeSubpath()
                planeContext.fill(plane, with: .color(portalOrange))

                if planeProgress > 0.75 {
                    let dotAlpha = (planeProgress - 0.75) * 1.2
                    let dotRect = CGRect(x: -2.5, y: -2.5, width: 5, height: 5)
                    planeContext.fill(Path(ellipseIn: dotRect), with: .color(portalOrange.opacity(dotAlpha)))
                }
            }
        }
    }

    private func quadPoint(t: CGFloat, start: CGPoint, control: CGPoint, end: CGPoint) -> CGPoint {
        let u = 1 - t
        return CGPoint(
            x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
            y: u * u * start.y + 2 * u * t * control.y + t * t * end.y
        )
    }

    private func quadTangentAngle(t: CGFloat, start: CGPoint, control: CGPoint, end: CGPoint) -> Double {
        let u = 1 - t
        let dx = 2 * u * (control.x - start.x) + 2 * t * (end.x - control.x)
        let dy = 2 * u * (control.y - start.y) + 2 * t * (end.y - control.y)
        return atan2(dy, dx)
    }
}
