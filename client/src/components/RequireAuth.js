import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../services/authService";

const RequireAuth = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await fetchMe();
      if (!user) {
        navigate("/login");
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) return <p>Loading...</p>;
  return children;
};

export default RequireAuth;
