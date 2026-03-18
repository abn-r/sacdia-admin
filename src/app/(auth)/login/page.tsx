"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/lib/auth/actions";
import type { AuthActionState } from "@/lib/auth/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="lc-btn">
      {pending ? <Loader2 className="animate-spin" size={17} /> : "Iniciar sesión"}
    </button>
  );
}

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <style>{`
        /* ══ LIGHT tokens ══ */
        :root {
          --lc-bg:         #f4f8f0;
          --lc-noise1:     rgba(120,185,90,0.12);
          --lc-noise2:     rgba(80,150,55,0.08);
          --lc-card-bg:    rgba(255,255,255,0.82);
          --lc-card-border:rgba(60,130,40,0.14);
          --lc-card-shadow:0 2px 40px rgba(0,0,0,0.07),0 1px 0 rgba(80,160,50,0.06) inset;
          --lc-brand-c:    rgba(22,68,12,0.85);
          --lc-brand-sub:  rgba(50,110,28,0.45);
          --lc-title-c:    #163a0a;
          --lc-sub-c:      rgba(50,110,28,0.5);
          --lc-div-c:      rgba(60,130,40,0.15);
          --lc-label-c:    rgba(40,100,18,0.55);
          --lc-input-bg:   rgba(240,250,232,0.7);
          --lc-input-border:rgba(60,130,40,0.18);
          --lc-input-c:    #163a0a;
          --lc-placeholder:rgba(70,130,38,0.32);
          --lc-focus-b:    rgba(50,120,28,0.6);
          --lc-focus-s:    rgba(50,120,28,0.09);
          --lc-pw-c:       rgba(60,120,28,0.38);
          --lc-err-c:      #7a1a1a;
          --lc-err-bg:     rgba(180,40,40,0.05);
          --lc-err-b:      rgba(180,40,40,0.16);
          --lc-btn1:       #2d6a20; --lc-btn2: #3a8c2a;
          --lc-btn1h:      #357828; --lc-btn2h: #44a034;
          --lc-btn-c:      #f0ffe8;
          --lc-btn-border: rgba(50,120,28,0.25);
          --lc-btn-glow:   rgba(45,106,30,0.22);
          --lc-verse-c:    rgba(50,120,28,0.35);
        }

        /* ══ DARK tokens ══ */
        @media (prefers-color-scheme: dark) {
          :root {
            --lc-bg:         #0c1a10;
            --lc-noise1:     rgba(52,140,80,0.12);
            --lc-noise2:     rgba(30,100,55,0.08);
            --lc-card-bg:    rgba(12,28,16,0.72);
            --lc-card-border:rgba(82,183,136,0.14);
            --lc-card-shadow:0 2px 50px rgba(0,0,0,0.4),0 1px 0 rgba(82,183,136,0.08) inset;
            --lc-brand-c:    rgba(200,240,210,0.88);
            --lc-brand-sub:  rgba(140,200,160,0.45);
            --lc-title-c:    #d4f0de;
            --lc-sub-c:      rgba(140,200,160,0.5);
            --lc-div-c:      rgba(82,183,136,0.16);
            --lc-label-c:    rgba(160,215,180,0.55);
            --lc-input-bg:   rgba(255,255,255,0.05);
            --lc-input-border:rgba(82,183,136,0.18);
            --lc-input-c:    #d4f0de;
            --lc-placeholder:rgba(140,200,160,0.28);
            --lc-focus-b:    rgba(82,183,136,0.5);
            --lc-focus-s:    rgba(82,183,136,0.1);
            --lc-pw-c:       rgba(140,200,160,0.4);
            --lc-err-c:      #fca5a5;
            --lc-err-bg:     rgba(220,38,38,0.08);
            --lc-err-b:      rgba(220,38,38,0.18);
            --lc-btn1:       #2d7a4f; --lc-btn2: #3a9960;
            --lc-btn1h:      #358a5a; --lc-btn2h: #44aa6e;
            --lc-btn-c:      #e8f5ec;
            --lc-btn-border: rgba(82,183,136,0.25);
            --lc-btn-glow:   rgba(45,122,79,0.28);
            --lc-verse-c:    rgba(120,180,140,0.36);
          }
        }

        .lc-root {
          font-family: var(--font-geist-sans, system-ui, sans-serif);
          min-height: 100svh;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          overflow: hidden;
          background-color: var(--lc-bg);
        }

        /* ── Soft background blobs ── */
        .lc-blobs {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 0;
        }
        .lc-blobs::before,
        .lc-blobs::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          animation: lc-drift 20s ease-in-out infinite alternate;
        }
        .lc-blobs::before {
          width: 60vw; height: 50vh;
          background: radial-gradient(ellipse, var(--lc-noise1) 0%, transparent 70%);
          top: -10%; left: -15%;
        }
        .lc-blobs::after {
          width: 50vw; height: 45vh;
          background: radial-gradient(ellipse, var(--lc-noise2) 0%, transparent 70%);
          bottom: -10%; right: -10%;
          animation-delay: -10s;
        }
        @keyframes lc-drift {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(30px,20px) scale(1.08); }
        }

        /* ── Card ── */
        .lc-card-wrap {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 400px;
          animation: lc-reveal 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        }

        @keyframes lc-reveal {
          from { opacity:0; transform: translateY(28px) scale(0.97); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }

        .lc-card {
          background: var(--lc-card-bg);
          border: 1px solid var(--lc-card-border);
          border-radius: 20px;
          padding: 2.5rem 2rem 2rem;
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          box-shadow: var(--lc-card-shadow);
        }

        /* ── Brand ── */
        .lc-brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1.75rem;
          animation: lc-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both;
        }
        .lc-brand-name {
          font-size: 0.875rem; font-weight: 600;
          color: var(--lc-brand-c);
          letter-spacing: 0.04em; text-transform: uppercase;
        }
        .lc-brand-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--lc-div-c); margin: 0 0.1rem;
        }
        .lc-brand-sub {
          font-size: 0.75rem; color: var(--lc-brand-sub); letter-spacing: 0.06em;
        }

        /* ── Title ── */
        .lc-title {
          font-size: 1.5rem; font-weight: 600;
          color: var(--lc-title-c);
          letter-spacing: -0.02em; line-height: 1.2;
          margin: 0 0 0.4rem;
          animation: lc-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.35s both;
        }
        .lc-subtitle {
          font-size: 0.8125rem; color: var(--lc-sub-c);
          margin-bottom: 1.75rem;
          animation: lc-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }

        /* ── Divider ── */
        .lc-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--lc-div-c), transparent);
          margin-bottom: 1.75rem;
          animation: lc-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }

        /* ── Form ── */
        .lc-form { display: flex; flex-direction: column; gap: 1.125rem; }

        .lc-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          animation: lc-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        .lc-field:nth-of-type(1) { animation-delay: 0.44s; }
        .lc-field:nth-of-type(2) { animation-delay: 0.50s; }

        .lc-label {
          font-size: 0.75rem; font-weight: 500;
          color: var(--lc-label-c);
          letter-spacing: 0.05em; text-transform: uppercase;
        }
        .lc-input-wrap { position: relative; display: flex; align-items: center; }
        .lc-input {
          font-family: inherit; font-size: 0.9375rem;
          color: var(--lc-input-c);
          background: var(--lc-input-bg);
          border: 1px solid var(--lc-input-border);
          border-radius: 10px; padding: 0.7rem 0.875rem;
          outline: none; width: 100%;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .lc-input::placeholder { color: var(--lc-placeholder); }
        .lc-input:focus {
          border-color: var(--lc-focus-b);
          box-shadow: 0 0 0 3px var(--lc-focus-s);
        }
        .lc-input-pw { padding-right: 2.75rem; }

        .lc-pw-toggle {
          position: absolute; right: 0.75rem;
          background: none; border: none; cursor: pointer;
          color: var(--lc-pw-c);
          display: flex; align-items: center; padding: 0;
          transition: color 0.15s;
        }
        .lc-pw-toggle:hover { filter: brightness(1.4); }

        /* ── Error ── */
        .lc-error {
          font-size: 0.8125rem;
          color: var(--lc-err-c);
          background: var(--lc-err-bg);
          border: 1px solid var(--lc-err-b);
          border-radius: 10px;
          padding: 0.6rem 0.875rem;
          animation: lc-up 0.25s ease both;
        }

        /* ── Button ── */
        .lc-btn {
          margin-top: 0.5rem; width: 100%;
          background: linear-gradient(135deg, var(--lc-btn1) 0%, var(--lc-btn2) 100%);
          color: var(--lc-btn-c);
          font-family: inherit; font-size: 0.875rem; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          border: 1px solid var(--lc-btn-border);
          border-radius: 10px; padding: 0.8rem 1.25rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
          animation: lc-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.56s both;
          box-shadow: 0 2px 20px var(--lc-btn-glow);
        }
        .lc-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--lc-btn1h) 0%, var(--lc-btn2h) 100%);
          box-shadow: 0 4px 28px var(--lc-btn-glow);
          transform: translateY(-1px);
        }
        .lc-btn:active:not(:disabled) { transform: translateY(0); }
        .lc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Verse ── */
        .lc-verse {
          margin-top: 1.5rem; text-align: center;
          font-size: 0.6875rem; color: var(--lc-verse-c);
          letter-spacing: 0.04em; font-style: italic;
          animation: lc-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.62s both;
        }

        @keyframes lc-up {
          from { opacity:0; transform: translateY(10px); }
          to   { opacity:1; transform: translateY(0); }
        }
      `}</style>

      <div className="lc-root">
        {/* Background blobs */}
        <div className="lc-blobs" aria-hidden="true" />

        {/* Card */}
        <div className="lc-card-wrap">
          <div className="lc-card">
            <div className="lc-brand">
              <Image src="/svg/LogoSACDIA.svg" alt="SACDIA" width={26} height={26} priority />
              <span className="lc-brand-name">SACDIA</span>
              <span className="lc-brand-dot" />
              <span className="lc-brand-sub">Sistema Administrativo</span>
            </div>

            <h1 className="lc-title">Bienvenido de nuevo</h1>
            <p className="lc-subtitle">Ingresa tus credenciales para acceder al panel</p>
            <div className="lc-divider" />

            <form action={formAction} className="lc-form">
              {state.error && <div className="lc-error">{state.error}</div>}

              <div className="lc-field">
                <label htmlFor="email" className="lc-label">Correo electrónico</label>
                <div className="lc-input-wrap">
                  <input
                    id="email" name="email" type="email"
                    placeholder="admin@sacdia.org"
                    required autoComplete="email" autoFocus
                    className="lc-input"
                  />
                </div>
              </div>

              <div className="lc-field">
                <label htmlFor="password" className="lc-label">Contraseña</label>
                <div className="lc-input-wrap">
                  <input
                    id="password" name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required autoComplete="current-password" minLength={8}
                    className="lc-input lc-input-pw"
                  />
                  <button
                    type="button" className="lc-pw-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <SubmitButton />
            </form>

            <p className="lc-verse">&ldquo;Todo lo puedo en Cristo que me fortalece&rdquo; — Fil. 4:13</p>
          </div>
        </div>

      </div>
    </>
  );
}
