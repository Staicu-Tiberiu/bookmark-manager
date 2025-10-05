import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

const safeParse = (val) => {
  if (!val) return [];
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
  if (Array.isArray(val)) return val;
  return [];
};

const ImportSessionPage = () => {
  const { importId } = useParams();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/import-history/${importId}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const parsedData = data.map((bookmark) => ({
            ...bookmark,
            extracted_images: safeParse(bookmark.extracted_images),
            extracted_links: safeParse(bookmark.extracted_links),
            extracted_videos: safeParse(bookmark.extracted_videos),
          }));

          setBookmarks(parsedData);

          // Initialize all collapsed
          const initialExpanded = {};
          parsedData.forEach(bookmark => {
            initialExpanded[bookmark.id] = { text: false, images: false, links: false, videos: false };
          });
          setExpanded(initialExpanded);
        } else {
          setBookmarks([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setBookmarks([]);
        setLoading(false);
      });
  }, [importId]);

  const toggleExpand = (bookmarkId, field) => {
    setExpanded(prev => ({
      ...prev,
      [bookmarkId]: {
        ...prev[bookmarkId],
        [field]: !prev[bookmarkId]?.[field]
      }
    }));
  };

  const expandAll = () => {
    const newExpanded = {};
    bookmarks.forEach(bookmark => {
      newExpanded[bookmark.id] = { text: true, images: true, links: true, videos: true };
    });
    setExpanded(newExpanded);
  };

  const collapseAll = () => {
    const newExpanded = {};
    bookmarks.forEach(bookmark => {
      newExpanded[bookmark.id] = { text: false, images: false, links: false, videos: false };
    });
    setExpanded(newExpanded);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <Link to="/profile">← Back to Profile</Link>
      <h2>📜 Import Session #{importId}</h2>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={expandAll} style={{ marginRight: "10px" }}>Expand All</button>
        <button onClick={collapseAll}>Collapse All</button>
      </div>

      {bookmarks.length === 0 ? (
        <p>No bookmarks found for this session.</p>
      ) : (
        bookmarks.map((bookmark) => (
          <div key={bookmark.id} style={{ marginBottom: "30px", borderBottom: "1px solid #ccc", paddingBottom: "20px" }}>
            <h3>🔖 {bookmark.title}</h3>
            <p><a href={bookmark.url} target="_blank" rel="noopener noreferrer">{bookmark.url}</a></p>

            {/* 📝 Extracted Text */}
            <button onClick={() => toggleExpand(bookmark.id, 'text')}>
              {expanded[bookmark.id]?.text ? "Hide" : "Show"} Extracted Text
            </button>
            {expanded[bookmark.id]?.text && (
              <pre style={{ background: "#f9f9f9", padding: "10px", whiteSpace: "pre-wrap" }}>
                {bookmark.extracted_text || "No text extracted."}
              </pre>
            )}

            {/* 🖼 Images */}
            {bookmark.extracted_images.length > 0 && (
              <>
                <button onClick={() => toggleExpand(bookmark.id, 'images')}>
                  {expanded[bookmark.id]?.images ? "Hide" : "Show"} Images ({bookmark.extracted_images.length})
                </button>
                {expanded[bookmark.id]?.images && (
                  <ul>
                    {bookmark.extracted_images.map((url, idx) => (
                      <li key={idx}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* 🔗 Links */}
            {bookmark.extracted_links.length > 0 && (
              <>
                <button onClick={() => toggleExpand(bookmark.id, 'links')}>
                  {expanded[bookmark.id]?.links ? "Hide" : "Show"} Links ({bookmark.extracted_links.length})
                </button>
                {expanded[bookmark.id]?.links && (
                  <ul>
                    {bookmark.extracted_links.map((url, idx) => (
                      <li key={idx}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* 🎞 Videos */}
            {bookmark.extracted_videos.length > 0 && (
              <>
                <button onClick={() => toggleExpand(bookmark.id, 'videos')}>
                  {expanded[bookmark.id]?.videos ? "Hide" : "Show"} Videos ({bookmark.extracted_videos.length})
                </button>
                {expanded[bookmark.id]?.videos && (
                  <ul>
                    {bookmark.extracted_videos.map((url, idx) => (
                      <li key={idx}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ImportSessionPage;
