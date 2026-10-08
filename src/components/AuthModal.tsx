import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles, UserPlus, LogIn, Check } from "lucide-react";
import { User } from "../types";
import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const AVATAR_OPTIONS = [
  "🦁", "🦁", "🦒", "🦓", "🦅", "🐆", "🐘", "🦚", "🐪", "🦉", "🦊", "🎨", "🚀"
];

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🦁");
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Reset error/success when changing tabs
  const handleTabChange = (tab: "signin" | "signup") => {
    setActiveTab(tab);
    setError("");
    setSuccessMsg("");
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Get user from Firestore
      const userDoc = await getDoc(doc(db, "users", uid));
      let user: User;

      if (userDoc.exists()) {
        user = userDoc.data() as User;
      } else {
        user = {
          id: uid,
          username: email.split("@")[0],
          email: email,
          avatar: "🦁",
          createdAt: new Date().toISOString(),
          role: "user"
        };
        await setDoc(doc(db, "users", uid), user);
      }

      setSuccessMsg(`Welcome back, ${user.username}!`);
      localStorage.setItem("hornai_current_user", JSON.stringify(user));
      
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(err.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !username.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const newUser: User = {
        id: uid,
        username: username.trim(),
        email: email.trim(),
        avatar: selectedAvatar,
        createdAt: new Date().toISOString(),
        role: "user"
      };

      // Save user profile directly to Firestore
      await setDoc(doc(db, "users", uid), newUser);

      setSuccessMsg("Account successfully created!");
      localStorage.setItem("hornai_current_user", JSON.stringify(newUser));

      setTimeout(() => {
        onSuccess(newUser);
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else {
        setError(err.message || "An error occurred while creating your account.");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="auth-modal-wrapper">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col"
        id="auth-modal-card"
      >
        {/* Banner header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Linguistic Portal Account
            </span>
            <h3 className="text-lg font-bold font-display text-slate-100">
              {activeTab === "signin" ? "Welcome back to HornAI" : "Join the Linguistic Core"}
            </h3>
            <p className="text-xs text-slate-400">
              {activeTab === "signin" 
                ? "Sign in to save translations, glossaries, and access insights."
                : "Create a free profile to track your Amharic & Somali work."}
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/50 p-1">
          <button
            type="button"
            onClick={() => handleTabChange("signin")}
            className={`py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 rounded-lg cursor-pointer ${
              activeTab === "signin"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("signup")}
            className={`py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 rounded-lg cursor-pointer ${
              activeTab === "signup"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={activeTab === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
            
            {/* EMAIL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  disabled={loading || successMsg !== ""}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl focus:outline-none transition-all font-sans"
                  required
                />
              </div>
            </div>

            {/* USERNAME (SIGNUP ONLY) */}
            {activeTab === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., horn_linguist"
                    disabled={loading || successMsg !== ""}
                    minLength={3}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl focus:outline-none transition-all font-sans"
                    required
                  />
                </div>
              </div>
            )}

            {/* PASSWORD */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  disabled={loading || successMsg !== ""}
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl focus:outline-none transition-all font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {activeTab === "signup" && (
                <span className="text-[10px] text-slate-400 block mt-0.5">Password must be at least 6 characters.</span>
              )}
            </div>

            {/* CONFIRM PASSWORD (SIGNUP ONLY) */}
            {activeTab === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    disabled={loading || successMsg !== ""}
                    className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl focus:outline-none transition-all font-sans"
                    required
                  />
                </div>
              </div>
            )}

            {/* AVATAR SELECTOR (SIGNUP ONLY) */}
            {activeTab === "signup" && (
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Choose Avatar</label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  {AVATAR_OPTIONS.map((av, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                        selectedAvatar === av
                          ? "bg-indigo-50 border-indigo-600 scale-110 shadow-xs"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading || successMsg !== ""}
              className="w-full py-2.5 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : activeTab === "signin" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Register Profile</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Local session isolation. Credential indices are sandboxed securely on your client.</span>
        </div>
      </motion.div>
    </div>
  );
}
