"use client";

import Link from "next/link";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";

export default function Login() {
    return (
        <div className="auth-page shop-page">
            <MotionProvider />
            <Header />
            <main className="auth-split">
                {/* Left Side: Visual Brand Presence */}
                <div className="auth-visual">
                    <div className="auth-visual-text">
                        <h2>Welcome back.</h2>
                        <p>Your journey to radical aesthetics continues.</p>
                    </div>
                </div>

                {/* Right Side: Clean Minimal Form */}
                <div className="auth-content">
                    <div className="auth-form-wrapper">
                        <h1 className="auth-title">Log in</h1>
                        <p className="auth-subtitle">Enter your details to access your account.</p>

                        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="email">Email</label>
                                <input className="auth-input" type="email" id="email" placeholder="Email address" required />
                            </div>
                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="password">Password</label>
                                <input className="auth-input" type="password" id="password" placeholder="Password" required />
                            </div>

                            <div className="auth-options">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ accentColor: 'var(--color-text)' }} />
                                    Remember me
                                </label>
                                <Link href="#" className="auth-link">Forgot password?</Link>
                            </div>

                            <button type="submit" className="auth-submit">Sign In</button>
                        </form>

                        <div className="auth-footer">
                            Don't have an account? <Link href="/signup" className="auth-link">Sign up</Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
