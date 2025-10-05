// import React from "react";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Bookmarks from "./Bookmarks";
// import ExtractionHistoryPage from "./components/ExtractionHistoryPage";
// import Login from "./components/Login"; // Import Login component
// import Register from "./components/Register"; // Import Register component

// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Bookmarks />} />
//         <Route path="/extraction-history/:bookmarkId" element={<ExtractionHistoryPage />} />
//         <Route path="/login" element={<Login />} /> {/* Add Login route */}
//         <Route path="/register" element={<Register />} /> {/* Add Register route */}
//       </Routes>
//     </Router>
//   );
// }

// export default App;

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import Bookmarks from "./Bookmarks";
import ExtractionHistoryPage from "./components/ExtractionHistoryPage";
import Login from "./components/Login";
import Register from "./components/Register";
import { fetchMe, logoutUser } from "./services/authService";
import RequireAuth from "./components/RequireAuth";
import Profile from "./components/Profile";
import ImportSessionPage from "./components/ImportSessionPage";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./App.css"; 

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchMe().then(setUser);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <Router>
      <div style={{ padding: "20px" }}>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4 px-3">
  <div className="container-fluid">
    <Link className="navbar-brand" to="/">BookmarkApp</Link>
    <div className="collapse navbar-collapse">
      <ul className="navbar-nav me-auto mb-2 mb-lg-0">
        {!user ? (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/login">Login</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/register">Register</Link>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/profile">Profile</Link>
            </li>
            <li className="nav-item">
              <button className="nav-link" onClick={handleLogout}>Logout</button>
            </li>
          </>
        )}
      </ul>
      {user && (
        <span className="navbar-text">
          Logged in as <strong>{user.username}</strong>
        </span>
      )}
    </div>
  </div>
</nav>


        <Routes>
        <Route
            path="/"
            element={
              <RequireAuth>
                <Bookmarks user={user} />
              </RequireAuth>
            }
          />
          <Route
            path="/extraction-history/:bookmarkId"
            element={
              <RequireAuth>
                <ExtractionHistoryPage />
              </RequireAuth>
            }
          />
          
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile user={user} setUser={setUser} />
              </RequireAuth>
            }
          />
          <Route
            path="/import-session/:importId"
            element={
              <RequireAuth>
                <ImportSessionPage />
              </RequireAuth>
            }
          />
      
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          
        </Routes>
      </div>
    </Router>
  );
}

export default App;
