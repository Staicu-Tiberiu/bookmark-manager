import React from "react";

const BookmarkForm = ({ form, handleChange, handleSubmit, editing, handleCancelEdit }) => (
  <form onSubmit={handleSubmit}>
    <input
      type="text"
      name="title"
      value={form.title}
      placeholder="Title"
      onChange={handleChange}
      required
    />
    <input
      type="url"
      name="url"
      value={form.url}
      placeholder="URL"
      onChange={handleChange}
      required
    />
    <input
      type="text"
      name="description"
      value={form.description}
      placeholder="Description"
      onChange={handleChange}
    />
    <button type="submit">{editing !== null ? "Update" : "Add"} Bookmark</button>
    {editing !== null && (
      <button type="button" onClick={handleCancelEdit}>Cancel</button>
    )}
  </form>
);

export default BookmarkForm;
