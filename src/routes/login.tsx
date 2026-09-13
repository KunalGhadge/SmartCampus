import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { loginWithEmail, loginWithGoogle, formatAuthErrorMessage } from "@/lib/auth-service";
import { useRedirectAuthenticated } from "@/lib/route-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  useRedirectAuthenticated("/dashboard");
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      toast.success("Signed in successfully.");
      navigate({ to: "/dashboard" });
    } catch (authError) {
      setError(formatAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      toast.success("Signed in with Google.");
      navigate({ to: "/dashboard" });
    } catch (authError) {
      setError(formatAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthAside />
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold lg:hidden">SmartCampus</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your MGM College SmartCampus account.</p>

            <div className="mt-7 grid gap-2">
              <SocialBtn provider="Google" onClick={handleGoogleSignIn} disabled={loading} />
              <SocialBtn provider="Apple" disabled title="Apple sign-in is not configured yet." />
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-3" onSubmit={handleEmailSignIn}>
              <Field
                icon={Mail}
                label="MGM College email"
                type="email"
                placeholder="student@mgmcollege.edu"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <div>
                <Field
                  icon={Lock}
                  label="Password"
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="text-muted-foreground"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <div className="mt-2 text-right">
                  <a href="#" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                className="w-full rounded-xl bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                size="lg"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  icon: Icon,
  label,
  trailing,
  ...rest
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input
          {...rest}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {trailing}
      </div>
    </label>
  );
}

export function SocialBtn({
  provider,
  onClick,
  disabled,
  title,
}: {
  provider: string;
  onClick?: () => Promise<void>;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full justify-center gap-2 rounded-xl border-border/80 hover:bg-secondary/60"
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      {provider === "Google" ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      ) : null}
      Continue with {provider}
    </Button>
  );
}

export function AuthAside() {
  return (
    <div className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-10 lg:text-primary-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
      <div className="relative flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-background/15 backdrop-blur">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <span className="font-semibold">SmartCampus · MGM College</span>
      </div>
      <div className="relative max-w-md">
        <Sparkles className="h-6 w-6 opacity-80" />
        <h2 className="mt-4 font-display text-3xl font-semibold leading-tight">
          The trusted marketplace built exclusively for verified MGM College students.
        </h2>
        <p className="mt-3 text-sm opacity-80">
          Books, gadgets, notes, cycles, hostel essentials — buy and sell with fellow students you can
          actually meet on campus.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <div className="flex -space-x-2">
            {[12, 47, 33, 20].map((n) => (
              <img
                key={n}
                src={`https://i.pravatar.cc/80?img=${n}`}
                className="h-8 w-8 rounded-full border-2 border-primary-foreground/30"
                alt=""
              />
            ))}
          </div>
          <span className="text-xs opacity-80">
            Joined by 4,200+ verified students across MGM College
          </span>
        </div>
      </div>
      <div className="relative text-xs opacity-60">© SmartCampus · Built for MGM College students</div>
    </div>
  );
}
