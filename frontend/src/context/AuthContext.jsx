import React, { createContext, useState, useEffect } from "react";
import { setAuthToken } from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Load from localStorage safely
  const loadAuth = () => {
    try {
      const raw = localStorage.getItem("auth");
      if (!raw) return { user: null, token: null };
      const parsed = JSON.parse(raw);

      // ensure both fields exist
      return {
        user: parsed.user || null,
        token: parsed.token || null,
      };
    } catch {
      return { user: null, token: null };
    }
  };

  const [auth, setAuth] = useState(loadAuth());

  // Save whenever auth updates
  useEffect(() => {
    if (auth?.token) setAuthToken(auth.token);
    else setAuthToken(null);

    localStorage.setItem("auth", JSON.stringify(auth));
  }, [auth]);

  // LOGIN
  const login = (user, token) => {
    setAuth({ user, token });
  };

  // LOGOUT
  const logout = () => {
    setAuth({ user: null, token: null });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
