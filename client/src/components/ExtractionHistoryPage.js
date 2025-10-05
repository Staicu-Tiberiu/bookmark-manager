import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const ExtractionHistoryPage = () => {
  const { bookmarkId } = useParams();
  const [extractions, setExtractions] = useState([]);

  const [selectedExtraction, setSelectedExtraction] = useState(null);
const [selectedExtractionId, setSelectedExtractionId] = useState(null);

  const [loading, setLoading] = useState(true);
  const location = useLocation();
const bookmarkTitle = location.state?.title || `#${bookmarkId}`;

  useEffect(() => {
    const fetchExtractions = async () => {
      try {
        const res = await axios.get(`${API_URL}/bookmarks/${bookmarkId}/extractions`);
        setExtractions(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load extraction history:", err);
      }
    };

    fetchExtractions();
  }, [bookmarkId]);

  const loadExtractionDetails = async (extractionId) => {
    if (selectedExtractionId === extractionId) {
      // Collapse if clicking the same one again
      setSelectedExtraction(null);
      setSelectedExtractionId(null);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/extractions/${extractionId}`);
      const extraction = res.data;
  
      const safeParse = (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return [];
          }
        }
        return Array.isArray(val) ? val : [];
      };
  
      extraction.extracted_images = safeParse(extraction.extracted_images);
      extraction.extracted_links = safeParse(extraction.extracted_links);
      extraction.extracted_videos = safeParse(extraction.extracted_videos);
  
      setSelectedExtraction(extraction);
    setSelectedExtractionId(extractionId);
    } catch (err) {
      console.error("Failed to load extraction content:", err);
    }
  };
  
  return (
    <div className="container py-4">
  <Link to="/" className="btn btn-link mb-3">← Back to Bookmarks</Link>

  <h2 className="mb-4">📜 Extraction History for Bookmark: <strong>{bookmarkTitle}</strong></h2>

  {loading ? (
    <p>Loading history...</p>
  ) : (
    <>
      <div className="list-group mb-4">
        {extractions.map((extraction) => (
        <button
        key={extraction.id}
        className={`list-group-item list-group-item-action ${selectedExtractionId === extraction.id ? "active" : ""}`}
        onClick={() => loadExtractionDetails(extraction.id)}
      >
        📄 {new Date(extraction.created_at).toLocaleString()}
      </button>
        ))}
      </div>

      {selectedExtraction && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">🧠 Extracted Content</h5>
          </div>
          <div className="card-body">
            <pre className="bg-light p-3 rounded" style={{ whiteSpace: "pre-wrap" }}>
              {selectedExtraction.extracted_text}
            </pre>

            {selectedExtraction.extracted_images.length > 0 && (
              <>
                <h6 className="mt-4">🖼 Images</h6>
                <ul className="list-unstyled">
                  {selectedExtraction.extracted_images.map((url, idx) => (
                    <li key={idx}>
                      <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {selectedExtraction.extracted_links.length > 0 && (
              <>
                <h6 className="mt-4">🔗 Links</h6>
                <ul className="list-unstyled">
                  {selectedExtraction.extracted_links.map((url, idx) => (
                    <li key={idx}>
                      <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {selectedExtraction.extracted_videos.length > 0 && (
              <>
                <h6 className="mt-4">🎞 Videos</h6>
                <ul className="list-unstyled">
                  {selectedExtraction.extracted_videos.map((url, idx) => (
                    <li key={idx}>
                      <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )}
</div>

  );
};

export default ExtractionHistoryPage;
