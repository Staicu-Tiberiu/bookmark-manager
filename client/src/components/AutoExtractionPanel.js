import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const AutoExtractionPanel = () => {
  const [type, setType] = useState("all"); // all/manual/last
  const [frequency, setFrequency] = useState(24); // hours
  const [currentSetting, setCurrentSetting] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchCurrentAutoExtraction();
    fetchBookmarks();
  }, []);

  const fetchCurrentAutoExtraction = async () => {
    try {
      const res = await axios.get(`${API_URL}/auto-extraction`);
      if (res.data) {
        setCurrentSetting(res.data);
      }
    } catch (err) {
      console.error("Error loading auto-extraction:", err);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await axios.get(`${API_URL}/bookmarks`);
      const all = [];

      Object.values(res.data.folders).forEach(folder => {
        all.push(...folder.bookmarks);
      });
      all.push(...res.data.noFolder);

      setBookmarks(all);
    } catch (err) {
      console.error("Error loading bookmarks:", err);
    }
  };

  const handleSave = async () => {
    if (!frequency || frequency <= 0) {
      alert("Frequency must be a positive number");
      return;
    }

    try {
      await axios.post(`${API_URL}/auto-extraction`, {
        type,
        selected: type === "manual" ? selectedIds : [],
        frequencyHours: frequency,
      });
      setMessage("✅ Auto-extraction scheduled successfully");
      fetchCurrentAutoExtraction();
    } catch (err) {
      console.error("Error saving auto-extraction:", err);
      setMessage("❌ Failed to save auto-extraction");
    }
  };

  const handleDisable = async () => {
    try {
      await axios.delete(`${API_URL}/auto-extraction`);
      setMessage("✅ Auto-extraction disabled");
      setCurrentSetting(null);
    } catch (err) {
      console.error("Error disabling auto-extraction:", err);
      setMessage("❌ Failed to disable auto-extraction");
    }
  };

  const handleBookmarkSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  return (
    <div style={{ border: "1px solid gray", padding: "20px", marginBottom: "20px", borderRadius: "8px" }}>
      <h3>Auto Extraction Settings</h3>

      <div style={{ marginBottom: "10px" }}>
        <label>Type: </label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All Bookmarks</option>
          <option value="manual">Manual Selection</option>
          <option value="last">Last Used</option>
        </select>
      </div>

      {type === "manual" && (
        <div style={{ marginBottom: "10px" }}>
          <h4>Select Bookmarks:</h4>
          <div style={{ maxHeight: "200px", overflowY: "scroll", border: "1px solid #ccc", padding: "10px" }}>
            {bookmarks.map(b => (
              <div key={b.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(b.id)}
                    onChange={() => handleBookmarkSelect(b.id)}
                  />
                  {" "}
                  {b.title}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "10px" }}>
        <label>Frequency (hours): </label>
        <input
          type="number"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          min="1"
          style={{ width: "60px" }}
        />
      </div>

      <button onClick={handleSave} style={{ marginRight: "10px" }}>Save Auto Extraction</button>
      <button onClick={handleDisable}>Disable Auto Extraction</button>

      {message && <div style={{ marginTop: "10px" }}>{message}</div>}

      {currentSetting && (
        <div style={{ marginTop: "20px" }}>
          <h4>Current Auto-Extraction Setup:</h4>
          <p><strong>Type:</strong> {currentSetting.type}</p>
          <p><strong>Frequency:</strong> Every {currentSetting.frequency_hours} hours</p>
          <p><strong>Next Run:</strong> {new Date(currentSetting.next_run).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default AutoExtractionPanel;
