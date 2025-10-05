import axios from "axios";
axios.defaults.withCredentials = true;

const API_URL = "http://localhost:5000/api";

// Bookmarks
export const fetchAllBookmarks = () => axios.get(`${API_URL}/bookmarks`);
export const createBookmark = (data) => axios.post(`${API_URL}/bookmarks`, data);
export const updateBookmark = (id, data) => axios.put(`${API_URL}/bookmarks/${id}`, data);
export const deleteBookmark = (id) => axios.delete(`${API_URL}/bookmarks/${id}`);
export const moveBookmark = (id, folderId) =>
  axios.put(`${API_URL}/bookmarks/${id}/move`, { folder_id: folderId });
export const removeFromFolder = (id) =>
  axios.put(`${API_URL}/bookmarks/${id}/remove-from-folder`);

// Folders
export const fetchAllFolders = () => axios.get(`${API_URL}/folders`);
export const createFolder = (name) => axios.post(`${API_URL}/folders`, { name });
export const updateFolder = (id, data) => axios.put(`${API_URL}/folders/${id}`, data);
export const deleteFolder = (id, deleteBookmarks) =>
  axios.delete(`${API_URL}/folders/${id}?deleteBookmarks=${deleteBookmarks}`);

// Extraction Preferences
export const saveExtractionPreference = (type, selected) =>
  axios.post(`${API_URL}/extraction/save`, { type, selected });

export const loadLastUsed = async () => {
    const res = await axios.get(`${API_URL}/extraction/last`);
    return res.data;
  };
  
  