// Note: redirect is unused until we add server-side auth checks

// Redirect new users to complete their profile after first sign-in
export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">👋</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">Welcome!</h1>
        <p className="text-muted-foreground">
          Let&apos;s set up your profile before we dive in. This only takes a minute.
        </p>
        <a
          href="/dashboard"
          className="inline-block w-full py-3 px-6 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Get Started →
        </a>
      </div>
    </div>
  );
}
