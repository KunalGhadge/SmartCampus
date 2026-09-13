import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ShoppingBag, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthAside, Field, SocialBtn } from "./login";
import { signupWithEmail, loginWithGoogle, formatAuthErrorMessage } from "@/lib/auth-service";
import { useRedirectAuthenticated } from "@/lib/route-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  useRedirectAuthenticated("/dashboard");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signupWithEmail(email, password, name);
      toast.success("Account created successfully.");
      navigate({ to: "/dashboard" });
    } catch (authError) {
      setError(formatAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Use your MGM College email to get verified instantly.
              </p>

              <div className="mt-7 grid gap-2">
                <SocialBtn provider="Google" onClick={handleGoogleSignUp} disabled={loading} />
                <SocialBtn provider="Apple" disabled title="Apple sign-in is not configured yet." />
              </div>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> OR{" "}
                <div className="h-px flex-1 bg-border" />
              </div>

              <form className="space-y-3" onSubmit={handleCreateAccount}>
                <Field
                  icon={User}
                  label="Full name"
                  placeholder="Alex Morgan"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
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
                <Field
                  icon={Lock}
                  label="Password"
                  type={show ? "text" : "password"}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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
                <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-foreground" />
                  We&apos;ll send a verification email after your account is created.
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Continue"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
