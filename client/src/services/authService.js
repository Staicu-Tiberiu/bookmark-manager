const API_URL = "http://localhost:5000/api";

export const loginUser = async (username, password) => {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) return { success: true, user: data.user };
    return { success: false, error: data.error };
  } catch (e) {
    return { success: false, error: "Network error" };
  }
};

export const registerUser = async (username, password) => {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) return { success: true };
    return { success: false, error: data.error };
  } catch (e) {
    return { success: false, error: "Network error" };
  }
};

export const logoutUser = async () => {
  await fetch(`${API_URL}/logout`, { method: "POST", credentials: "include" });
};

export const fetchMe = async () => {
  const res = await fetch(`${API_URL}/me`, { credentials: "include" });
  if (res.ok) return res.json();
  return null;
};
