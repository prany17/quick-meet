// import axios from "axios";

// export const API = axios.create({
//   baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api",
// });

import axios from "axios";

export const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL + "/api",
});

export const setAuthToken = (token) => {
  if (token) API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete API.defaults.headers.common["Authorization"];
};
