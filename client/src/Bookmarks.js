import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    fetchAllBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    moveBookmark,
    removeFromFolder,
    //fetchAllFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    saveExtractionPreference,
    loadLastUsed
} from "./services/bookmarkServices";
import BookmarkForm from "./components/BookmarkForm";
import BookmarkList from "./components/BookmarkList";
import FolderForm from "./components/FolderForm";
import FolderList from "./components/FolderList";
import ExtractionPanel from "./components/ExtractionPanel";
import AutoExtractionsManager from "./components/AutoExtractionsManager";


const API_URL = "http://localhost:5000/api";

const Bookmarks = () => {
    const [bookmarks, setBookmarks] = useState({ folders: {}, noFolder: [] });
    //const [folders, setFolders] = useState([]);
    const [form, setForm] = useState({ title: "", url: "", description: "" });
    const [editing, setEditing] = useState(null);
    const [newFolder, setNewFolder] = useState("");
    const [editingFolder, setEditingFolder] = useState(null);
    const [folderForm, setFolderForm] = useState({ name: "" });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectionMode, setSelectionMode] = useState("all"); // 'all', 'manual', 'last'
    const [selectedBookmarks, setSelectedBookmarks] = useState([]);
    const [lastUsedMessage, setLastUsedMessage] = useState("");
    const [importMessage, setImportMessage] = useState("");


    const [showExtractionTools, setShowExtractionTools] = useState(false); // collapsed initially



    useEffect(() => {
        fetchBookmarks();
        // fetchFolders();
    }, []);

    const [openFolders, setOpenFolders] = useState([]);

    const handleFolderClick = (folderId) => {
        setOpenFolders(prev =>
            prev.includes(folderId)
                ? prev.filter(id => id !== folderId) // Remove if already open (toggle off)
                : [...prev, folderId] // Add if closed (toggle on)
        );
    };

    const fetchBookmarks = async () => {
        const response = await fetchAllBookmarks();
        setBookmarks(response.data);
    };

    // const fetchFolders = async () => {
    //     const response = await fetchAllFolders();
    //     setFolders(response.data);
    // };


    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFolderChange = (e) => {
        setFolderForm({ ...folderForm, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editing !== null) {
            await updateBookmark(editing, form);
            setEditing(null);
        } else {
            await createBookmark(form);
        }
        setForm({ title: "", url: "", description: "" });
        fetchBookmarks();
    };

    const handleFolderSubmit = async (e) => {
        e.preventDefault();
        if (editingFolder !== null) {
            try {
                await updateFolder(editingFolder, folderForm);

                // Update UI immediately
                setBookmarks(prev => ({
                    ...prev,
                    folders: {
                        ...prev.folders,
                        [editingFolder]: { ...prev.folders[editingFolder], name: folderForm.name }
                    }
                }));

                setEditingFolder(null);
                setFolderForm({ name: "" });
            } catch (error) {
                console.error("Error updating folder:", error);
            }
        }
    };


    const handleCancelEdit = () => {
        setEditing(null);
        setForm({ title: "", url: "", description: "" });
    };

    const handleCancelFolderEdit = () => {
        setEditingFolder(null);
        setFolderForm({ name: "" });
    };

    const handleCreateFolder = async () => {
        if (newFolder.trim() !== "") {
            try {
                const response = await createFolder(newFolder);

                // Update UI immediately
                setBookmarks(prev => ({
                    ...prev,
                    folders: {
                        ...prev.folders,
                        [response.data.id]: { id: response.data.id, name: response.data.name, bookmarks: [] }
                    }
                }));

                setNewFolder(""); // Clear input
            } catch (error) {
                console.error("Error creating folder:", error);
            }
        }
    };

    const handleDeleteFolder = async (folderId, deleteBookmarks) => {
        try {
            await deleteFolder(folderId, deleteBookmarks);

            // Update state properly without reloading
            setBookmarks(prev => {
                const updatedFolders = { ...prev.folders };
                delete updatedFolders[folderId]; // Remove folder from state

                let updatedNoFolder = prev.noFolder;
                if (!deleteBookmarks) {
                    // Move bookmarks from the deleted folder to noFolder
                    const movedBookmarks = prev.folders[folderId]?.bookmarks || [];
                    updatedNoFolder = [...prev.noFolder, ...movedBookmarks];
                }

                return { folders: updatedFolders, noFolder: updatedNoFolder };
            });

        } catch (error) {
            console.error("Error deleting folder:", error);
        }
    };
    const handleRemoveFromFolder = async (bookmarkId) => {
        try {
            //const response = await removeFromFolder(bookmarkId);
            await removeFromFolder(bookmarkId);
            // Re-fetch the updated bookmark so we can add it to noFolder
            const bookmarkRes = await fetchAllBookmarks();
            const allBookmarks = bookmarkRes.data;

            // Find the moved bookmark from server response
            let movedBookmark = null;
            for (const folderId in allBookmarks.folders) {
                const match = allBookmarks.folders[folderId].bookmarks.find(b => b.id === bookmarkId);
                if (match) {
                    movedBookmark = match;
                    break;
                }
            }

            if (!movedBookmark) {
                movedBookmark = allBookmarks.noFolder.find(b => b.id === bookmarkId);
            }

            if (!movedBookmark) {
                console.warn("Bookmark not found in response.");
                return;
            }

            setBookmarks(prev => {
                // Remove it from previous folder
                const updatedFolders = { ...prev.folders };
                for (const folderId in updatedFolders) {
                    updatedFolders[folderId].bookmarks = updatedFolders[folderId].bookmarks.filter(b => b.id !== bookmarkId);
                }

                // Add it to noFolder
                const updatedNoFolder = [...prev.noFolder, movedBookmark];

                return {
                    folders: updatedFolders,
                    noFolder: updatedNoFolder
                };
            });

        } catch (error) {
            console.error("Error removing bookmark from folder:", error);
        }
    };


    const handleDeleteBookmark = async (bookmarkId) => {
        try {
            await deleteBookmark(bookmarkId);
            fetchBookmarks();
        } catch (error) {
            console.error("Error deleting bookmark:", error);
        }
    };

    const handleMoveBookmark = async (bookmarkId, folderId) => {
        await moveBookmark(bookmarkId, folderId);
        fetchBookmarks();
    };

    const handleEditBookmark = (bookmark) => {
        setEditing(bookmark.id);
        setForm({ title: bookmark.title, url: bookmark.url, description: bookmark.description });
    };

    const handleEditFolder = (folder) => {
        setEditingFolder(folder.id);
        setFolderForm({ name: folder.name });
    };

    const highlightMatch = (text, term) => {
        if (!term) return text;
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === term.toLowerCase()
                ? <mark key={index} style={{ backgroundColor: 'yellow' }}>{part}</mark>
                : part
        );
    };
    //   const handleStartImport = async () => {
    //     if (selectionMode === "all") {
    //       console.log("Importing from ALL bookmarks");
    //       await saveExtractionPreference("all", []); // explicitly pass empty selected
    //     } else if (selectionMode === "manual") {
    //       console.log("Importing from selected bookmarks:", selectedBookmarks);
    //       await saveExtractionPreference("manual", selectedBookmarks);
    //     } else if (selectionMode === "last") {
    //       const last = await loadLastUsed();
    //       if (last) {
    //         console.log("Using last selection:", last);
    //       } else {
    //         alert("No last used data found.");
    //       }
    //     }
    //   };
    const handleStartImport = async () => {
        try {
            let idsToUse = [];

            if (selectionMode === "all") {
                const allBookmarks = [
                    ...bookmarks.noFolder,
                    ...Object.values(bookmarks.folders).flatMap(folder => folder.bookmarks)
                ];
                idsToUse = allBookmarks.map(b => b.id);
                await saveExtractionPreference("all", []);
            } else if (selectionMode === "manual") {
                idsToUse = selectedBookmarks;
                await saveExtractionPreference("manual", selectedBookmarks);
            } else if (selectionMode === "last") {
                const last = await loadLastUsed();
                if (!last || !last.selected_bookmark_ids) {
                    setImportMessage("⚠️ No last used data found.");
                    return;
                }
                idsToUse = last.selected_bookmark_ids.split(",").map(id => parseInt(id));
            }

            if (idsToUse.length === 0) {
                setImportMessage("⚠️ No bookmarks selected for import.");
                return;
            }

            // 🚀 Trigger backend extraction
            const res = await axios.post(`${API_URL}/extract`, { ids: idsToUse });

            if (res.data && res.data.import_id) {
                setImportMessage(`✅ Import successful! Session ID: ${res.data.import_id}`);
            } else {
                setImportMessage("⚠️ Import completed, but no session ID returned.");
            }
        } catch (err) {
            console.error("Error during import:", err);
            setImportMessage("❌ Import failed. Check the console for more info.");
        }
    };





    //   const saveExtractionPreference = async () => {
    //     try {
    //         await saveExtractionPreference(selectionMode, selectedBookmarks);
    //     } catch (err) {
    //       console.error("Error saving extraction preference", err);
    //     }
    //   };
    //   const loadLastUsed = async () => {
    //     try {
    //         const last = await loadLastUsed();
    //     } catch (err) {
    //       console.error("Error loading last extraction", err);
    //       return null;
    //     }
    //   };


    return (
        <div className="container">
            <h2>Bookmark Manager</h2>
            <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Auto Extraction Manager</h5>
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setShowExtractionTools(prev => !prev)}
                    >
                        {showExtractionTools ? "Collapse" : "Expand"}
                    </button>
                </div>
                {showExtractionTools && (
                    <div className="card-body">
                        <AutoExtractionsManager bookmarksData={bookmarks} />


                    </div>
                )}
            </div>

            <ExtractionPanel
                bookmarks={bookmarks}
                selectionMode={selectionMode}
                setSelectionMode={setSelectionMode}
                selectedBookmarks={selectedBookmarks}
                setSelectedBookmarks={setSelectedBookmarks}
                lastUsedMessage={lastUsedMessage}
                setLastUsedMessage={setLastUsedMessage}
                handleStartImport={handleStartImport}
                importMessage={importMessage}
                setImportMessage={setImportMessage}
            />
            <h3>Search bookmarks</h3>
            <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4 p-2 border rounded w-full"
            />
            <h3>Add bookmark</h3>
            <BookmarkForm
                form={form}
                editing={editing}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                handleCancelEdit={handleCancelEdit}
            />
            <h3>Folders</h3>
            <FolderForm
                newFolder={newFolder}
                setNewFolder={setNewFolder}
                editingFolder={editingFolder}
                folderForm={folderForm}
                handleFolderChange={handleFolderChange}
                handleCreateFolder={handleCreateFolder}
                handleFolderSubmit={handleFolderSubmit}
                handleCancelFolderEdit={handleCancelFolderEdit}
            />

            <FolderList
                bookmarks={bookmarks}
                openFolders={openFolders}
                handleFolderClick={handleFolderClick}
                searchTerm={searchTerm}
                selectionMode={selectionMode}
                selectedBookmarks={selectedBookmarks}
                setSelectedBookmarks={setSelectedBookmarks}
                handleDeleteFolder={handleDeleteFolder}
                handleEditFolder={handleEditFolder}
                handleRemoveFromFolder={handleRemoveFromFolder}
                handleMoveBookmark={handleMoveBookmark}
                handleEditBookmark={handleEditBookmark}
                handleDeleteBookmark={handleDeleteBookmark}
                highlightMatch={highlightMatch}
            />
            <h3>Bookmarks</h3>

            <BookmarkList
                bookmarks={bookmarks.noFolder}
                folders={bookmarks.folders}
                searchTerm={searchTerm}
                selectionMode={selectionMode}
                selectedBookmarks={selectedBookmarks}
                setSelectedBookmarks={setSelectedBookmarks}
                handleMoveBookmark={handleMoveBookmark}
                handleEditBookmark={handleEditBookmark}
                handleDeleteBookmark={handleDeleteBookmark}
                highlightMatch={highlightMatch}
            />
        </div>
    );

};

export default Bookmarks;