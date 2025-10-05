import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import Modal from "react-modal";
import axios from "axios";

Modal.setAppElement("#root");

const API_URL = "http://localhost:5000/api";

const AutoExtractionsManager =  ({ bookmarksData }) => {
  const [autoExtractions, setAutoExtractions] = useState([]);

  const [message, setMessage] = useState("");

  const [type, setType] = useState("all");
  const [frequency, setFrequency] = useState(24);
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
const [editingExtraction, setEditingExtraction] = useState(null);

const [editName, setEditName] = useState("");
const [editFrequency, setEditFrequency] = useState(24);
const [editSelectedIds, setEditSelectedIds] = useState([]);

  useEffect(() => {
    fetchAutoExtractions();
    //fetchBookmarks();
  }, []);

  const fetchAutoExtractions = async () => {
    try {
      const res = await axios.get(`${API_URL}/auto-extractions`);
      setAutoExtractions(res.data || []);
    } catch (err) {
      console.error("Error loading auto-extractions:", err);
    }
  };
  useEffect(() => {
    // Whenever bookmarksData changes, update the list
    if (bookmarksData) {
      const all = [];
  
      Object.values(bookmarksData.folders).forEach(folder => {
        all.push(...folder.bookmarks);
      });
      all.push(...bookmarksData.noFolder);
  
      setBookmarks(all);
    }
  }, [bookmarksData]);

  const openEditModal = (extraction) => {
    setEditingExtraction(extraction);
    setEditName(extraction.name || "");
    setEditFrequency(extraction.frequency_hours);
    setEditSelectedIds(
      extraction.selected_bookmark_ids
        ? extraction.selected_bookmark_ids.split(",").map(id => parseInt(id))
        : []
    );
    setEditModalOpen(true);
  };
  
  const handleEditSave = async () => {
    try {
      await axios.patch(`${API_URL}/auto-extractions/${editingExtraction.id}`, {
        name: editName,
        frequencyHours: editFrequency,
        selected: editSelectedIds,
      });
  
      setAutoExtractions(prev => prev.map(ae =>
        ae.id === editingExtraction.id
          ? { ...ae, name: editName, frequency_hours: editFrequency, selected_bookmark_ids: editSelectedIds.join(",") }
          : ae
      ));
  
      setEditModalOpen(false);
      setEditingExtraction(null);
      setMessage("✅ Auto-extraction updated!");
    } catch (err) {
      console.error("Error updating auto-extraction:", err);
      setMessage("❌ Failed to update auto-extraction");
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

  const refreshEverything = async () => {
    await fetchBookmarks();
    await fetchAutoExtractions();
  };
  

  const handleSave = async () => {
    if (!frequency || frequency <= 0) {
      alert("Frequency must be a positive number");
      return;
    }

    try {
      await axios.post(`${API_URL}/auto-extractions`, {
        type,
        selected: type === "manual" ? selectedIds : [],
        frequencyHours: frequency,
      });
      setMessage("✅ Auto-extraction created!");
      fetchAutoExtractions();
    } catch (err) {
      console.error("Error saving auto-extraction:", err);
      setMessage("❌ Failed to create auto-extraction");
    }
  };

  const handleDisable = async (id) => {
    try {
      await axios.delete(`${API_URL}/auto-extractions/${id}`);
      setMessage("✅ Auto-extraction disabled");
      fetchAutoExtractions();
    } catch (err) {
      console.error("Error disabling auto-extraction:", err);
      setMessage("❌ Failed to disable");
    }
  };

  const handleDisableAll = async () => {
    try {
      await axios.delete(`${API_URL}/auto-extractions`);
      setMessage("✅ All auto-extractions disabled");
      fetchAutoExtractions();
    } catch (err) {
      console.error("Error disabling all auto-extractions:", err);
      setMessage("❌ Failed to disable all");
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
      <h2>Auto Extractions Manager</h2>

      <h4>Create New Auto Extraction</h4>
      <div style={{ marginBottom: "10px" }}>
        <label>Type: </label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All Bookmarks</option>
          <option value="manual">Manual Selection</option>
          
        </select>
      </div>

      {type === "manual" && (
        <div style={{ marginBottom: "10px" }}>
          <h5>Select Bookmarks:</h5>
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

      <button onClick={handleSave} style={{ marginRight: "10px" }}>Save New Auto Extraction</button>
      <button onClick={handleDisableAll}>Disable All Auto Extractions</button>

      {message && <div style={{ marginTop: "10px" }}>{message}</div>}

      <hr style={{ margin: "20px 0" }} />

      <h4>Active Auto Extractions:</h4>

      {autoExtractions.length === 0 ? (
  <p>No active auto extractions.</p>
) : (
  autoExtractions.map(ae => {
    const selectedTitles = [];

    if (ae.type === "manual" && ae.selected_bookmark_ids) {
      const ids = ae.selected_bookmark_ids.split(',').map(id => parseInt(id));
      ids.forEach(id => {
        const bookmark = bookmarks.find(b => b.id === id);
        if (bookmark) {
          selectedTitles.push(bookmark.title);
        }
      });
    }

    return (
      <div key={ae.id} style={{ marginBottom: "10px", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
         <h4>
    {ae.name ? ae.name : "(No name)"} {" "}
    <span style={{ fontSize: "0.8em", color: "gray" }}>
    
    </span>
  </h4>

        <p><strong>Type:</strong> {ae.type}</p>
        <p><strong>Frequency:</strong> Every {ae.frequency_hours} hours</p>
        <p><strong>Next Run:</strong> {new Date(ae.next_run).toLocaleString()}</p>

        {ae.type === "manual" && (
          <div>
            <p><strong>Selected Bookmarks:</strong></p>
            {selectedTitles.length > 0 ? (
              <ul>
                {selectedTitles.map((title, idx) => (
                  <li key={idx}>{title}</li>
                ))}
              </ul>
            ) : (
              <p>No bookmarks found (may have been deleted).</p>
            )}
          </div>
        )}

        <button onClick={() => handleDisable(ae.id)}>Disable</button>
        <button onClick={() => openEditModal(ae)}>Edit</button>
      </div>
    );
  })
)}

<Modal
    isOpen={editModalOpen}
    onRequestClose={() => setEditModalOpen(false)}
    contentLabel="Edit Auto Extraction"
    style={{
      content: {
        width: "400px",
        height: "500px",
        margin: "auto",
        borderRadius: "10px",
        padding: "20px"
      }
    }}
  >
    <h3>Edit Auto Extraction</h3>

    {/* Modal form here */}
    <div style={{ marginBottom: "10px" }}>
      <label>Name:</label>
      <input
        type="text"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        style={{ width: "100%" }}
      />
    </div>

    <div style={{ marginBottom: "10px" }}>
      <label>Frequency (hours):</label>
      <input
        type="number"
        min="1"
        value={editFrequency}
        onChange={(e) => setEditFrequency(Number(e.target.value))}
        style={{ width: "100px" }}
      />
    </div>

    {editingExtraction?.type === "manual" && (
  <div style={{ marginBottom: "10px" }}>
    <label>Select Bookmarks:</label>
    <div style={{ maxHeight: "200px", overflowY: "scroll", border: "1px solid #ccc", padding: "10px" }}>
      {bookmarks.map(b => (
        <div key={b.id}>
          <label>
            <input
              type="checkbox"
              checked={editSelectedIds.includes(b.id)}
              onChange={() => {
                if (editSelectedIds.includes(b.id)) {
                  setEditSelectedIds(prev => prev.filter(x => x !== b.id));
                } else {
                  setEditSelectedIds(prev => [...prev, b.id]);
                }
              }}
            />
            {" "}
            {b.title}
          </label>
        </div>
      ))}
    </div>
  </div>
)}


    <button onClick={handleEditSave} style={{ marginRight: "10px" }}>Save Changes</button>
    <button onClick={() => setEditModalOpen(false)}>Cancel</button>
  </Modal>
      
    </div>
    
  );
};

export default AutoExtractionsManager;
