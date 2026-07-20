import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Mail, Lock, User, AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "../utils/supabaseClient";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactName, setContactName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/portal");
      } else {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { contact_name: contactName },
            emailRedirectTo: `${window.location.origin}/portal/login`,
          },
        });
        if (error) throw error;
        // Supabase returns a user with no identities if the email is already taken
        if (signUpData?.user && signUpData.user.identities?.length === 0) {
          throw new Error("An account with this email already exists. Try logging in instead.");
        }
        setSignupSuccess(true);
      }
    } catch (err) {
      const msg = err?.message || JSON.stringify(err) || "Something went wrong.";
      if (msg === "{}" || msg === "{}}" ) {
        setError("An account with this email may already exist. Try logging in instead.");
      } else if (msg.includes("<!DOCTYPE") || msg.includes("is not valid JSON")) {
        setError("Unable to reach the authentication service. Please try again in a moment.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-[#22c55e]" />
          </div>
          <h2 className="text-2xl font-black text-white">Check your email</h2>
          <p className="text-white/55 text-sm max-w-sm mx-auto">
            We sent a confirmation link to <strong className="text-white">{email}</strong>. Click the link to activate your account, then come back here to log in.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setMode("login"); }}
            className="text-sm text-[#22c55e] font-semibold hover:underline"
          >
            Back to log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center px-5">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <a href="/commercial" className="inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-[#0a0f0d]" />
            </div>
            <div className="leading-none text-left">
              <span className="text-white font-black tracking-widest text-sm uppercase">Squatterz</span>
              <div className="text-[#22c55e] text-[9px] tracking-[0.2em] font-semibold uppercase mt-0.5">Client Portal</div>
            </div>
          </a>
          <h1 className="text-3xl font-black text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-white/45">
            {mode === "login"
              ? "Log in to view jobs, invoices, and documentation."
              : "Sign up to access your commercial account portal."}
          </p>
        </div>

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/4 border border-white/8 rounded-2xl p-6 md:p-8 space-y-5">
          {mode === "signup" && (
            <label className="block space-y-2">
              <span className="block text-xs text-white/50 font-medium uppercase tracking-wider">Your name</span>
              <div className="flex items-center gap-3 bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#22c55e]/40 transition-colors">
                <User className="w-4 h-4 text-[#22c55e] shrink-0" />
                <input
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Jordan Rivera"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                />
              </div>
            </label>
          )}

          <label className="block space-y-2">
            <span className="block text-xs text-white/50 font-medium uppercase tracking-wider">Email</span>
            <div className="flex items-center gap-3 bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#22c55e]/40 transition-colors">
              <Mail className="w-4 h-4 text-[#22c55e] shrink-0" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan@managementco.com"
                autoComplete="email"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="block text-xs text-white/50 font-medium uppercase tracking-wider">Password</span>
            <div className="flex items-center gap-3 bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#22c55e]/40 transition-colors">
              <Lock className="w-4 h-4 text-[#22c55e] shrink-0" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {loading
              ? (mode === "login" ? "Logging in..." : "Creating account...")
              : (mode === "login" ? "Log In" : "Create Account")}
          </button>
        </form>

        <p className="text-center text-sm text-white/45">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(null); }} className="text-[#22c55e] font-semibold hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(null); }} className="text-[#22c55e] font-semibold hover:underline">
                Log in
              </button>
            </>
          )}
        </p>

        <div className="text-center">
          <a href="/commercial" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Commercial
          </a>
        </div>
      </div>
    </div>
  );
}
