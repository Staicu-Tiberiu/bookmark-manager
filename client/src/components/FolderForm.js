import React from "react";

const FolderForm = ({
  newFolder,
  setNewFolder,
  editingFolder,
  folderForm,
  handleFolderChange,
  handleCreateFolder,
  handleFolderSubmit,
  handleCancelFolderEdit
}) => {
  return (
    <div style={{ marginBottom: "15px" }}>
      {editingFolder !== null ? (
        <form onSubmit={handleFolderSubmit}>
          <input
            type="text"
            name="name"
            value={folderForm.name}
            placeholder="Folder Name"
            onChange={handleFolderChange}
            required
          />
          <button type="submit">Update Folder</button>
          <button type="button" onClick={handleCancelFolderEdit}>Cancel</button>
        </form>
      ) : (
        <>
          <input
            type="text"
            value={newFolder}
            placeholder="New Folder Name"
            onChange={(e) => setNewFolder(e.target.value)}
          />
          <button onClick={handleCreateFolder}>Create Folder</button>
        </>
      )}
    </div>
  );
};

export default FolderForm;
