"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { telemetry } from "../../services/telemetry";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loginAttempts = useRef(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Email o contraseña incorrectos");
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);

      telemetry.track("auth_login_succeeded", {
        user_id_hash: data.user_id_hash || "unknown",
        auth_method: "password",
        user_role: data.role || "operator",
        client_ip_hash: "N/A",
      });

      router.push("/inventory/products");
    } catch (err: any) {
      loginAttempts.current += 1;
      setError(err.message);

      telemetry.track("auth_login_failed", {
        failure_reason: err.message,
        attempt_number: loginAttempts.current,
        client_ip_hash: "N/A",
        user_agent_category: navigator.userAgent,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "1.5rem",
        backgroundColor: "#0a0d12",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.16), transparent 60%)",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          padding: "2.5rem",
          backgroundColor: "rgba(18, 23, 33, 0.85)",
          backdropFilter: "blur(16px)",
          borderRadius: "1.25rem",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          width: "100%",
          maxWidth: "420px",
          color: "#f1f5f9",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #34d399, #059669)",
              color: "#0a0d12",
              fontWeight: 800,
              fontSize: "1.2rem",
              marginBottom: "0.75rem",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.35)",
            }}
          >
            N
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#fde68a",
              fontWeight: 700,
              marginBottom: "0.3rem",
            }}
          >
            Nexova Command Center
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", margin: 0 }}>
            Acceso Backoffice
          </h2>
        </div>

        {error && (
          <div
            style={{
              color: "#fecdd3",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#a7f3d0",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Email Corporativo
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@nexova.com"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#ffffff",
              backgroundColor: "#181f2c",
              fontSize: "0.95rem",
              outline: "none",
            }}
          />
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#a7f3d0",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#ffffff",
              backgroundColor: "#181f2c",
              fontSize: "0.95rem",
              outline: "none",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "0.85rem",
            backgroundColor: "#34d399",
            color: "#0a0d12",
            fontWeight: 800,
            fontSize: "0.95rem",
            border: "none",
            borderRadius: "0.75rem",
            cursor: "pointer",
            boxShadow: "0 0 25px rgba(16, 185, 129, 0.3)",
          }}
        >
          {isLoading ? "Entrando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}
