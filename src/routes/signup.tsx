import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ShoppingBag, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AuthAside, Field } from "./login";
import { signupWithEmail, formatAuthErrorMessage } from "@/lib/auth-service";
import { useRedirectAuthenticated } from "@/lib/route-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  useRedirectAuthenticated("/marketplace");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signupWithEmail(email, password, name);
      if (result.needsEmailVerification) {
        setRegisteredEmail(email);
        setVerifyDialogOpen(true);
        toast.info("Verification email sent! Please check your inbox.", {
          duration: 6000,
        });
      } else {
        toast.success("Account created successfully.");
        navigate({ to: "/marketplace" });
      }
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
            <span className="text-sm font-semibold lg:hidden">CampusKart</span>
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
                Sign up with your college or personal email to get started.
              </p>

              <form className="mt-6 space-y-3" onSubmit={handleCreateAccount}>
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
                  label="Email address"
                  type="email"
                  placeholder="you@gmail.com or student@college.edu"
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
                <div className="rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 p-3 text-xs text-foreground flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📸</span>
                    <span>Follow <strong>@campuskart.business</strong> on IG for <strong>+50 pts</strong></span>
                  </div>
                  <a
                    href="https://www.instagram.com/campuskart.business?stkn=MWx0Nms4c2piaGFhaA=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-pink-600 dark:text-pink-400 hover:underline shrink-0"
                  >
                    Follow →
                  </a>
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-foreground" />
                  We&apos;ll send a verification email with a link to activate your account.
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

      {/* Email Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center font-display text-xl font-semibold">
              Check your inbox to verify
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground pt-1">
              We've sent a verification link to{" "}
              <span className="font-semibold text-foreground">{registeredEmail}</span>.
              Please click the link in your email to activate your account.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 rounded-xl border border-border bg-secondary/50 p-3.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              What to do next:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Open your email inbox and click <strong>Confirm your email</strong>.</li>
              <li>Check your <strong>Spam</strong> or <strong>Junk</strong> folder if you don't see it within a minute.</li>
              <li>Once confirmed, you can immediately sign in.</li>
            </ul>
          </div>

          <a
            href="https://www.instagram.com/campuskart.business?stkn=MWx0Nms4c2piaGFhaA=="
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 p-3 text-xs font-semibold text-foreground hover:border-pink-500/60 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📸</span>
              <span>Follow @campuskart.business on Instagram</span>
            </div>
            <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-700 dark:text-pink-300">
              +50 pts bonus
            </span>
          </a>

          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full rounded-xl bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
              size="lg"
              onClick={() => {
                setVerifyDialogOpen(false);
                navigate({ to: "/login" });
              }}
            >
              Proceed to Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
