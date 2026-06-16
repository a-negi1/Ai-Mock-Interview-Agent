import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000, 
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);


export const authAPI = {
  register: (data) => api.post("/auth/signup", data),
  login: (data)    => api.post("/auth/login", data),
  me: ()           => api.get("/auth/me"),
};


export const resumeAPI = {
    upload: (formData) =>
    api.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

    analyze: (data) => api.post("/resume/analyze", data),
};


export const interviewAPI = {
    start: (data) => api.post("/interview/start", data),

    getSession: (id) => api.get(`/interview/${id}`),

    submitAnswer: (sessionId, data) =>
    api.post(`/interview/${sessionId}/answer`, data),

    transcribeVoice: (sessionId, data) =>
    api.post(`/interview/${sessionId}/transcribe`, data),

    endSession: (sessionId) => api.post(`/interview/${sessionId}/end`),

    listSessions: () => api.get("/interview"),
};


export const scoreAPI = {
    generateReport: (sessionId) => api.post(`/score/report/${sessionId}`),

    getReport: (sessionId) => api.get(`/score/report/${sessionId}`),

    atsCheck: (data) => api.post("/score/ats-check", data),

    history: () => api.get("/score/history"),
};

export default api;
