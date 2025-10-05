import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

const Profile = ({ user, setUser }) => {
  const [importHistory, setImportHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetch(`${API_URL}/import-history`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setImportHistory(Array.isArray(data) ? data : []); // 🛠 FIX HERE
        })
        .catch(() => setImportHistory([]));
    }
  }, [user]);
  

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone!")) return;

    const res = await fetch(`${API_URL}/delete-account`, {
      method: "DELETE",
      credentials: "include"
    });

    if (res.ok) {
      await logoutUser();
      setUser(null);
      navigate("/register");
    } else {
      alert("Failed to delete account.");
    }
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>👤 Profile: {user.username}</h2>

      <h3>📜 Import Sessions</h3>
          <ul>
              {importHistory.map((session) => (
                  <li key={session.id}>
                      <Link to={`/import-session/${session.id}`}>
                          📜 Session {session.id} - {new Date(session.imported_at).toLocaleString()}
                      </Link>
                  </li>
              ))}
          </ul>

      <button style={{ marginTop: "20px", backgroundColor: "red", color: "white" }} onClick={handleDeleteAccount}>
        Delete Account
      </button>
    </div>
  );
};

export default Profile;
