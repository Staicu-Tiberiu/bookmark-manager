import React from "react";
import { loadLastUsed } from "../services/bookmarkServices";

const ExtractionPanel = ({
  bookmarks,
  selectionMode,
  setSelectionMode,
  selectedBookmarks,
  setSelectedBookmarks,
  lastUsedMessage,
  setLastUsedMessage,
  handleStartImport,
  importMessage,          // 🔧 ADD THIS
  setImportMessage        // 🔧 AND THIS
}) => {

  const handleViewLastUsed = async () => {
    const last = await loadLastUsed();

    if (!last) {
      setLastUsedMessage("⚠️ No last selection found.");
      return;
    }

    if (last.type === "all") {
      setLastUsedMessage("📌 Last Used: ALL (includes all bookmarks)");
      return;
    }

    const selectedIds = last.selected_bookmark_ids
      .split(",")
      .map(id => parseInt(id));

    const allBookmarks = [
      ...bookmarks.noFolder,
      ...Object.values(bookmarks.folders).flatMap(folder => folder.bookmarks)
    ];

    const matched = allBookmarks.filter(b => selectedIds.includes(b.id));

    if (matched.length === 0) {
      setLastUsedMessage("Last Used: No matching bookmarks found.");
      return;
    }

    const message =
      `📌 Last Used: ${last.type.toUpperCase()}<br/>` +
      matched.map(b => `• ${b.title}`).join("<br/>");

    setLastUsedMessage(message);
  };

  return (
    <div style={{ marginTop: "30px", marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h3>🔍 Select Bookmarks for Extraction</h3>

      <label>
        <input
          type="radio"
          value="all"
          checked={selectionMode === "all"}
          onChange={() => setSelectionMode("all")}
        />
        All Bookmarks
      </label>

      <label style={{ marginLeft: "15px" }}>
        <input
          type="radio"
          value="manual"
          checked={selectionMode === "manual"}
          onChange={() => setSelectionMode("manual")}
        />
        Select Manually
      </label>

      <label style={{ marginLeft: "15px" }}>
        <input
          type="radio"
          value="last"
          checked={selectionMode === "last"}
          onChange={() => setSelectionMode("last")}
        />
        Last Time Used
      </label>

      <div style={{ marginTop: "15px" }}>
        <button onClick={handleStartImport}>🚀 Start Import</button>
              {importMessage && (
                  <div style={{
                      marginTop: "10px",
                      padding: "10px",
                      backgroundColor: "#f2f2f2",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      position: "relative"
                  }}>
                      <button
                          onClick={() => setImportMessage("")}
                          style={{
                              position: "absolute",
                              top: "5px",
                              right: "10px",
                              background: "transparent",
                              border: "none",
                              fontSize: "16px",
                              fontWeight: "bold",
                              cursor: "pointer"
                          }}
                      >
                          ×
                      </button>
                      {importMessage}
                  </div>
              )}

        <button onClick={handleViewLastUsed} style={{ marginLeft: "10px" }}>
          👁 View Last Used
        </button>
      </div>

      {lastUsedMessage && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            backgroundColor: "#f9f9f9",
            position: "relative"
          }}
        >
          <button
            onClick={() => setLastUsedMessage("")}
            style={{
              position: "absolute",
              top: "5px",
              right: "10px",
              border: "none",
              background: "transparent",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer"
            }}
            aria-label="Close"
          >
            ×
          </button>
          <div dangerouslySetInnerHTML={{ __html: lastUsedMessage }} />
        </div>
      )}
    </div>
  );
};

export default ExtractionPanel;
