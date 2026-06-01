import api from "./api";

export async function generateTasks() {
  const response = await api.post("/ai/generate-tasks");
  return response.data;
}
