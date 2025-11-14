import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import JoinRoom from "./pages/JoinRoom";
import { AuthContext } from "./context/AuthContext";

function PrivateRoute({ children }) {
  const { auth } = useContext(AuthContext);

  // auth.token is the REAL login check
  if (auth?.token === null) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/room/:id"
        element={
          <PrivateRoute>
            <JoinRoom />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
