import { useState } from "react";
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { Icon } from "../components/Icon";

const ROTATOR = [
  "Rate what you've seen.",
  "Discover what's next.",
  "Your taste, your truth.",
  "Film, finally organised.",
];

export function AuthPage() {
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [rotIdx] = useState(0);

  const clearError = () => setError("");

  const handleGoogle = async () => {
    setLoading(true); clearError();
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError(friendlyError(e.code)); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); clearError();
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      } else if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-brand">
        <div className="brand-marquee">
          {[0, 1, 2, 3].map((col) => (
            <div key={col} className={`bm-col ${col % 2 ? "rev" : ""}`}
              style={{ "--s": `${38 + col * 6}s` }}>
              {Array.from({ length: 9 }).map((_, i) => {
                const hue = ((col * 90 + i * 37) * 53) % 360;
                return (
                  <div key={i} className="bm-poster"
                    style={{ background: `radial-gradient(120% 120% at 30% 18%, oklch(0.26 0.05 ${hue}) 0%, oklch(0.11 0.02 ${hue}) 100%)` }}>
                    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" /><circle cx="20" cy="20" r="9" /><circle cx="20" cy="20" r="3" fill="currentColor" stroke="none" /></svg>
                    <i />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="brand-veil" />
        <div className="brand-content">
          <div className="brand-logo">
            <div className="mark">
              <svg viewBox="0 0 40 40" width="34" height="34">
                <circle cx="20" cy="20" r="18" className="lm-ring lm-ring-1" />
                <circle cx="20" cy="20" r="12.5" className="lm-ring lm-ring-2" />
                <circle cx="20" cy="20" r="5" className="lm-pupil" />
              </svg>
            </div>
            <span className="brand-word">Lumen</span>
          </div>
          <div className="brand-copy">
            <p className="brand-kicker">Your personal film log</p>
            <h1 className="brand-head">Every film,<br /><em>remembered.</em></h1>
            <div className="brand-rotator">
              {ROTATOR.map((s, i) => (
                <span key={s} className={i === rotIdx ? "on" : ""}>{s}</span>
              ))}
            </div>
          </div>
          <p className="brand-foot">TMDB · Firebase · Made with care</p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-head">
            <p className="auth-eyebrow">{mode === "reset" ? "Password reset" : mode === "signup" ? "Create account" : "Welcome back"}</p>
            <h2 className="auth-title">
              {mode === "reset" ? "Reset your password" : mode === "signup" ? "Start your log" : "Sign in to Lumen"}
            </h2>
            <p className="auth-sub">
              {mode === "reset" ? "We'll send a reset link to your email." : mode === "signup" ? "Track every film you've ever loved." : "Pick up where you left off."}
            </p>
          </div>

          {mode !== "reset" && (
            <>
              <div className="social">
                <button className="social-btn" onClick={handleGoogle} disabled={loading}>
                  <GoogleIcon />
                  Continue with Google
                </button>
              </div>
              <div className="divider">or</div>
            </>
          )}

          {resetSent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ color: "var(--text-2)", marginBottom: 16 }}>Check your inbox — reset link sent.</p>
              <button className="lm-btn lm-btn-ghost" onClick={() => { setMode("signin"); setResetSent(false); }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form className="fields" onSubmit={handleSubmit}>
              <div className={`field ${error && error.includes("email") ? "invalid" : ""}`}>
                <label>Email</label>
                <div className="field-input">
                  <input
                    type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    required autoComplete="email"
                  />
                </div>
              </div>
              {mode !== "reset" && (
                <div className={`field ${error && error.includes("password") ? "invalid" : ""}`}>
                  <label>Password</label>
                  <div className="field-input">
                    <input
                      type={showPw ? "text" : "password"} placeholder="••••••••"
                      value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      required autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    />
                    <button type="button" className="peek" onClick={() => setShowPw((s) => !s)}>
                      <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <p style={{ color: "color-mix(in oklch,var(--accent) 85%,white)", fontSize: 13 }}>{error}</p>
              )}
              {mode === "signin" && (
                <div className="row-aux">
                  <span />
                  <button type="button" className="link" onClick={() => { setMode("reset"); clearError(); }}>
                    Forgot password?
                  </button>
                </div>
              )}
              <button className={`submit ${loading ? "loading" : ""}`} type="submit" disabled={loading}>
                <span className="spin-ico" />
                <span className="submit-label">
                  {mode === "reset" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}
                </span>
                <span className="submit-arrow"><Icon name="arrow" size={18} /></span>
              </button>
            </form>
          )}

          <div className="switch">
            {mode === "signin" && <>No account? <button onClick={() => { setMode("signup"); clearError(); }}>Sign up free</button></>}
            {mode === "signup" && <>Already have one? <button onClick={() => { setMode("signin"); clearError(); }}>Sign in</button></>}
            {mode === "reset" && !resetSent && <button onClick={() => { setMode("signin"); clearError(); }}>Back to sign in</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function friendlyError(code) {
  const map = {
    "auth/invalid-email": "That email address isn't valid.",
    "auth/user-not-found": "No account with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "That email is already registered. Try signing in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "",
  };
  return map[code] || "Something went wrong. Please try again.";
}
