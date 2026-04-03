"use client";

import Link from "next/link";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";

export default function SignUp() {
    return (
        <div className="auth-page shop-page">
            <MotionProvider />
            <Header />
            <main className="auth-split">
                {/* Left Side: Visual Brand Presence */}
                <div className="auth-visual">
                    <div className="auth-visual-text">
                        <h2>Create an account.</h2>
                        <p>Join truekind to discover science-backed skincare.</p>
                    </div>
                </div>

                {/* Right Side: Clean Minimal Form */}
                <div className="auth-content">
                    <div className="auth-form-wrapper">
                        <h1 className="auth-title">Sign up</h1>
                        <p className="auth-subtitle">Fill in your details below to begin.</p>

                        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="auth-input-group" style={{ flex: 1 }}>
                                    <label className="auth-label" htmlFor="firstName">First Name</label>
                                    <input className="auth-input" type="text" id="firstName" placeholder="First Name" required />
                                </div>
                                <div className="auth-input-group" style={{ flex: 1 }}>
                                    <label className="auth-label" htmlFor="lastName">Last Name</label>
                                    <input className="auth-input" type="text" id="lastName" placeholder="Last Name" required />
                                </div>
                            </div>

                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="email">Email</label>
                                <input className="auth-input" type="email" id="email" placeholder="Email address" required />
                            </div>

                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="password">Password</label>
                                <input className="auth-input" type="password" id="password" placeholder="Create a password" required />
                            </div>

                            <button type="submit" className="auth-submit">Create Account</button>
                        </form>

                        <div className="auth-footer">
                            Already have an account? <Link href="/login" className="auth-link">Log in</Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
