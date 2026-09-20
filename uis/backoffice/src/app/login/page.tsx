"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
      router.push("/inventory/products");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f3f4f6" }}>
      <form
        onSubmit={handleLogin}
        style={{ padding: "2rem", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", width: "300px" }}
      >
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center", color: "#333" }}>Acceso Backoffice</h2>

        {error && <div style={{ color: "red", marginBottom: "1rem", fontSize: "0.875rem", textAlign: "center" }}>{error}</div>}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#666" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@nexova.com"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", color: "black", backgroundColor: "white" }}
          />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#666" }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", color: "black", backgroundColor: "white" }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{ width: "100%", padding: "0.75rem", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          {isLoading ? "Entrando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}