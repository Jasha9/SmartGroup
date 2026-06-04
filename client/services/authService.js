import api from "./api";

export async function googleLogin(credential) {
  const response = await api.post("/auth/google", { credential });
  return response.data;
}

export async function getMe() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function logout() {
  const response = await api.post("/auth/logout");
  return response.data;
}

export async function updateProfile(data) {
  const response = await api.patch("/auth/profile", data);
  return response.data;
}
