// src/FolderList.js
import React from "react";
import { Link } from "react-router-dom";
const FolderList = ({
  bookmarks,
  searchTerm,
  openFolders,
  handleFolderClick,
  handleDeleteFolder,
  handleEditFolder,
  handleRemoveFromFolder,
  handleEditBookmark,
  handleDeleteBookmark,
  handleMoveBookmark,
  selectionMode,
  selectedBookmarks,
  setSelectedBookmarks,
  highlightMatch
}) => {
  return (
    <ul>
      {Object.values(bookmarks.folders).map(folder => {
        const term = searchTerm.toLowerCase();
        const filteredBookmarks = folder.bookmarks.filter(b =>
          b.title.toLowerCase().includes(term) ||
          b.url.toLowerCase().includes(term) ||
          b.description?.toLowerCase().includes(term)
        );

        const shouldShowBookmarks = searchTerm ? filteredBookmarks.length > 0 : openFolders.includes(folder.id);

        return (
          <li key={folder.id}>
            <button onClick={() => handleFolderClick(folder.id)}>
              📂 {folder.name} ({folder.bookmarks.length})
            </button>
            <button onClick={() => handleDeleteFolder(folder.id, false)}>Delete (Keep Bookmarks)</button>
            <button onClick={() => handleDeleteFolder(folder.id, true)}>Delete (Remove Bookmarks)</button>
            <button onClick={() => handleEditFolder(folder)}>Edit Folder</button>

            {shouldShowBookmarks && (
              <ul>
                {filteredBookmarks.map(bookmark => (
                  <li key={bookmark.id}>
                    {selectionMode === "manual" && (
                      <input
                        type="checkbox"
                        checked={selectedBookmarks.includes(bookmark.id)}
                        onChange={(e) => {
                          setSelectedBookmarks(prev =>
                            e.target.checked
                              ? [...prev, bookmark.id]
                              : prev.filter(id => id !== bookmark.id)
                          );
                        }}
                      />
                    )}
                    <strong>{highlightMatch(bookmark.title, searchTerm)}</strong> -
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                      {highlightMatch(bookmark.url, searchTerm)}
                    </a>
                    <p>{highlightMatch(bookmark.description || "", searchTerm)}</p>
                    <select defaultValue="" onChange={(e) => handleMoveBookmark(bookmark.id, e.target.value)}>
                      <option value="" disabled>Move to Folder</option>
                      {Object.values(bookmarks.folders)
                        .filter(f => f.id !== bookmark.folder_id)
                        .map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                    <button onClick={() => handleRemoveFromFolder(bookmark.id)}>Remove from Folder</button>
                    <button onClick={() => handleEditBookmark(bookmark)}>Edit</button>
                    <button onClick={() => handleDeleteBookmark(bookmark.id)}>Delete</button>
                    <Link
                      to={`/extraction-history/${bookmark.id}`}
                      state={{ title: bookmark.title }}
                    >
                      <button>📜 View Extraction History</button>
                    </Link>

                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default FolderList;
