import axios from "axios";

const defaultBaseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:5000/api" : "/api";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || defaultBaseUrl,
  withCredentials: true,
});

export default api;
