/** Full-viewport login.png background shared by all auth routes. */
export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/login.png)" }}
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/20 to-black/45" />
      <div className="noise-overlay absolute inset-0 opacity-[0.07] mix-blend-overlay" />
    </div>
  );
}
