import React from "react";
import { Link } from "react-router-dom"; 
const BookmarkList = ({
  bookmarks,
  searchTerm,
  highlightMatch,
  handleMoveBookmark,
  handleEditBookmark,
  handleDeleteBookmark,
  selectionMode,
  selectedBookmarks,
  setSelectedBookmarks,
  folders
}) => (
  <ul>
    {bookmarks
      .filter(b =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(bookmark => (
        <li key={bookmark.id}>
          {selectionMode === "manual" && (
            <input
              type="checkbox"
              checked={selectedBookmarks.includes(bookmark.id)}
              onChange={(e) =>
                setSelectedBookmarks(prev =>
                  e.target.checked
                    ? [...prev, bookmark.id]
                    : prev.filter(id => id !== bookmark.id)
                )
              }
            />
          )}
          <strong>{highlightMatch(bookmark.title, searchTerm)}</strong> -{" "}
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
            {highlightMatch(bookmark.url, searchTerm)}
          </a>
          <p>{highlightMatch(bookmark.description || "", searchTerm)}</p>

          <select defaultValue="" onChange={(e) => handleMoveBookmark(bookmark.id, e.target.value)}>
            <option value="" disabled>Move to Folder</option>
            {Object.values(folders)
              .filter(f => f.id !== bookmark.folder_id)
              .map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
          </select>

          <button onClick={() => handleEditBookmark(bookmark)}>Edit Bookmark</button>
          <button onClick={() => handleDeleteBookmark(bookmark.id)}>Delete Bookmark</button>
          <Link
            to={`/extraction-history/${bookmark.id}`}
            state={{ title: bookmark.title }}
          >
            <button>📜 View Extraction History</button>
          </Link>

        </li>
      ))}
  </ul>
);

export default BookmarkList;
