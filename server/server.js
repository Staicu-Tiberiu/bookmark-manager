const session = require("express-session");
const bcrypt = require("bcrypt");

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const { chromium } = require("playwright");


 const axios = require("axios");
// const cheerio = require("cheerio");
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
    credentials: true
  }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'bookmark_secret_key', // Secret key for signing the session ID
  resave: false, // Prevents resaving session data if it hasn't changed
  saveUninitialized: false, // Prevents saving uninitialized sessions
  cookie: { secure: false } // Set `true` only if using HTTPS
}));

// Register
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const password_hash = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
  db.query(sql, [username, password_hash], (err, result) => {
    if (err) {
      // 🛑 Check if error is duplicate entry (ER_DUP_ENTRY)
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Username already in use" });
      }
      // Other database errors
      return res.status(500).json({ error: "Registration failed" });
    }
    res.json({ message: "User registered" });
  });
});

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(401).json({ error: "User not found" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    req.session.user = { id: user.id, username: user.username };
    res.json({ message: "Logged in successfully", user: req.session.user });
  });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out" });
});

// Get current user
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  res.json(req.session.user);
});


// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bookmarksapp",
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Connected to MySQL");
});

// Test API Route
app.get("/", (req, res) => {
    res.send("Welcome to Bookmark Manager API");
});

// 📌 Get All Folders and Bookmarks Separately
// 📌 Get All Folders and Bookmarks Separately
app.get("/api/bookmarks", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });
  
    const folderQuery = "SELECT * FROM folders WHERE user_id = ?";
    const bookmarkQuery = "SELECT * FROM bookmarks WHERE user_id = ?";
  
    db.query(folderQuery, [userId], (err, folderResults) => {
      if (err) return res.status(500).json({ error: "Database error (folders)" });
  
      db.query(bookmarkQuery, [userId], (err, bookmarkResults) => {
        if (err) return res.status(500).json({ error: "Database error (bookmarks)" });
  
        const structuredData = { folders: {}, noFolder: [] };
  
        folderResults.forEach(folder => {
          structuredData.folders[folder.id] = {
            id: folder.id,
            name: folder.name,
            bookmarks: [],
          };
        });
  
        bookmarkResults.forEach(bookmark => {
          if (bookmark.folder_id && structuredData.folders[bookmark.folder_id]) {
            structuredData.folders[bookmark.folder_id].bookmarks.push(bookmark);
          } else {
            structuredData.noFolder.push(bookmark);
          }
        });
  
        res.json(structuredData);
      });
    });
  });

// 📌 2️⃣ Add a New Bookmark
app.post("/api/bookmarks", (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    const { title, url, description } = req.body;
    const userId = req.session.user.id;
  
    const sql = "INSERT INTO bookmarks (title, url, description, user_id) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, url, description, userId], (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ id: result.insertId, title, url, description });
    });
});

// 📌 3️⃣ Edit a Bookmark
app.put("/api/bookmarks/:id", (req, res) => {
    const { title, url, description } = req.body;
    const { id } = req.params;
  
    db.query("UPDATE bookmarks SET title = ?, url = ?, description = ? WHERE id = ? AND user_id = ?", 
      [title, url, description, id, req.session.user.id], (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (result.affectedRows === 0) return res.status(403).json({ error: "Unauthorized or not found" });
      res.json({ message: "Bookmark updated successfully" });
    });
  });
  

// 📌 4️⃣ Delete a Bookmark and Clean Auto Extractions
app.delete("/api/bookmarks/:id", (req, res) => {
  const userId = req.session.user.id;
  const { id } = req.params;
  const bookmarkId = parseInt(id);

  // Step 1: Delete the bookmark
  db.query("DELETE FROM bookmarks WHERE id = ? AND user_id = ?", [bookmarkId, userId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error deleting bookmark" });
    if (result.affectedRows === 0) return res.status(403).json({ error: "Unauthorized or not found" });

    // Step 2: Clean up auto extractions
    db.query("SELECT * FROM auto_extractions WHERE user_id = ?", [userId], (err, extractions) => {
      if (err) {
        console.error("Error loading auto extractions:", err);
        return res.status(500).json({ error: "Database error loading auto extractions" });
      }

      const updates = [];

      extractions.forEach(extraction => {
        if (!extraction.selected_bookmark_ids) return; // Skip if none

        const ids = extraction.selected_bookmark_ids.split(',').map(x => parseInt(x));
        const newIds = ids.filter(x => x !== bookmarkId);

        if (newIds.length === 0) {
          // 🚨 No bookmarks left → delete this auto extraction
          updates.push(new Promise((resolve, reject) => {
            db.query("DELETE FROM auto_extractions WHERE id = ?", [extraction.id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          }));
        } else if (newIds.length !== ids.length) {
          // ✏️ Update the auto extraction with new list
          updates.push(new Promise((resolve, reject) => {
            db.query("UPDATE auto_extractions SET selected_bookmark_ids = ? WHERE id = ?", [newIds.join(","), extraction.id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          }));
        }
      });

      Promise.all(updates)
        .then(() => {
          res.json({ message: "Bookmark and auto extractions updated successfully" });
        })
        .catch(err => {
          console.error("Error cleaning up auto extractions:", err);
          res.status(500).json({ error: "Failed to update auto extractions" });
        });
    });
  });
});

// 📌 1️⃣ Get All Folders
app.get("/api/folders", (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  
    db.query("SELECT * FROM folders WHERE user_id = ?", [req.session.user.id], (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(results);
    });
  });
  

// 📌 2️⃣ Create a New Folder
app.post("/api/folders", (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  
    const { name } = req.body;
    db.query("INSERT INTO folders (name, user_id) VALUES (?, ?)", [name, req.session.user.id], (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ id: result.insertId, name });
    });
  });
  
// 📌 3️⃣ Delete a Folder (With or Without Bookmarks)
app.delete("/api/folders/:id", (req, res) => {
    const userId = req.session.user.id;
    const { id } = req.params;
    const { deleteBookmarks } = req.query;

    const checkFolderSql = "SELECT id FROM folders WHERE id = ? AND user_id = ?";
    db.query(checkFolderSql, [id, userId], (err, folderResults) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (folderResults.length === 0) return res.status(403).json({ error: "Folder not found or access denied" });

        if (deleteBookmarks === "true") {
            // Delete folder and its bookmarks
            db.query("DELETE FROM bookmarks WHERE folder_id = ? AND user_id = ?", [id, userId], (err) => {
                if (err) return res.status(500).json({ error: "Database error" });

                db.query("DELETE FROM folders WHERE id = ? AND user_id = ?", [id, userId], (err) => {
                    if (err) return res.status(500).json({ error: "Database error" });
                    res.json({ message: "Folder and bookmarks deleted" });
                });
            });
        } else {
            // Unassign bookmarks, then delete folder
            db.query("UPDATE bookmarks SET folder_id = NULL WHERE folder_id = ? AND user_id = ?", [id, userId], (err) => {
                if (err) return res.status(500).json({ error: "Database error" });

                db.query("DELETE FROM folders WHERE id = ? AND user_id = ?", [id, userId], (err) => {
                    if (err) return res.status(500).json({ error: "Database error" });
                    res.json({ message: "Folder deleted, bookmarks moved out" });
                });
            });
        }
    });
});

// 📌 4️⃣ Move a Bookmark to a Folder
app.put("/api/bookmarks/:id/move", (req, res) => {
    const userId = req.session.user.id;
    const { folder_id } = req.body;
    const { id } = req.params;

    const verifySql = `
      SELECT b.id AS bookmark_id, f.id AS folder_id
      FROM bookmarks b
      LEFT JOIN folders f ON f.id = ?
      WHERE b.id = ? AND b.user_id = ? AND (f.id IS NULL OR f.user_id = ?)
    `;

    db.query(verifySql, [folder_id, id, userId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (results.length === 0) return res.status(403).json({ error: "Access denied or invalid folder/bookmark" });

        db.query("UPDATE bookmarks SET folder_id = ? WHERE id = ? AND user_id = ?", [folder_id, id, userId], (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ message: "Bookmark moved successfully" });
        });
    });
});


app.put("/api/folders/:id", (req, res) => {
    const userId = req.session.user.id;
    const { name } = req.body;
    const { id } = req.params;

    const sql = "UPDATE folders SET name = ? WHERE id = ? AND user_id = ?";
    db.query(sql, [name, id, userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (result.affectedRows === 0) return res.status(403).json({ error: "Folder not found or access denied" });
        res.json({ message: "Folder updated successfully" });
    });
});

// Remove a bookmark from a folder (make it folderless)
app.put("/api/bookmarks/:id/remove-from-folder", (req, res) => {
    const userId = req.session.user.id;
    const { id } = req.params;

    const sql = "UPDATE bookmarks SET folder_id = NULL WHERE id = ? AND user_id = ?";
    db.query(sql, [id, userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (result.affectedRows === 0) return res.status(403).json({ error: "Bookmark not found or access denied" });
        res.json({ message: "Bookmark removed from folder successfully" });
    });
});


app.post('/api/extraction/save', (req, res) => {
    const userId = req.session.user.id;
    const { type, selected } = req.body; // 'all' or 'manual'
    const bookmarkIds = selected.join(',');

    const sql = `
      INSERT INTO extraction_preferences (user_id, type, selected_bookmark_ids) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      type = VALUES(type), 
      selected_bookmark_ids = VALUES(selected_bookmark_ids),
      updated_at = CURRENT_TIMESTAMP
    `;

    db.query(sql, [userId, type, bookmarkIds], (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ message: "Saved successfully" });
    });
});

  
app.get('/api/extraction/last', (req, res) => {
    const userId = req.session.user.id;

    const sql = `
      SELECT * 
      FROM extraction_preferences 
      WHERE user_id = ?
      ORDER BY updated_at DESC 
      LIMIT 1
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results[0] || null);
    });
});


  app.post("/api/extract", async (req, res) => {
    const userId = req.session.user.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No bookmark IDs provided." });
    }
      


    // 1. Create a new import session
    db.query("INSERT INTO import_history (user_id) VALUES (?)", [userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to create import session" });
    

        const importId = result.insertId;

        // 2. Insert bookmarks used in this import
        const values = ids.map(id => [importId, id]);
        db.query("INSERT INTO import_bookmarks (import_id, bookmark_id) VALUES ?", [values], (err) => {
            if (err) return res.status(500).json({ error: "Failed to log bookmarks" });

            // 3. Extract and save data for each bookmark
            const placeholders = ids.map(() => '?').join(',');
            db.query(`SELECT * FROM bookmarks WHERE id IN (${placeholders})`, ids, async (err, bookmarks) => {
                if (err) return res.status(500).json({ error: "Failed to load bookmarks" });

                const insertValues = await Promise.all(bookmarks.map(async (bookmark) => {
                    try {
                      const browser = await chromium.launch();
                      const page = await browser.newPage();
                      await page.goto(bookmark.url, { timeout: 20000, waitUntil: 'domcontentloaded' });
                  
                      const content = await page.content();
                      const title = await page.title();
                      const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => "");
                      const headings = await page.$$eval('h1,h2,h3,h4,h5,h6', els => els.map(el => el.textContent.trim()).join('\n'));
                      const paragraphs = await page.$$eval('p', els => els.map(el => el.textContent.trim()).join('\n'));
                  
                      const combinedText = `${title}\n${metaDesc}\n${headings}\n${paragraphs}`.trim();
                  
                      const images = await page.$$eval('img', (imgs, baseUrl) =>
                        imgs.map(img => new URL(img.getAttribute('src'), baseUrl).href).filter(Boolean),
                        bookmark.url
                      );
                  
                      const links = await page.$$eval('a', (as, baseUrl) =>
                        as.map(a => new URL(a.getAttribute('href'), baseUrl).href).filter(Boolean),
                        bookmark.url
                      );
                      
                  
                      const videos = await page.$$eval('video source, iframe', (els, baseUrl) =>
                        els.map(el => new URL(el.getAttribute('src'), baseUrl).href).filter(Boolean),
                        bookmark.url
                      );
                  
                      await browser.close();
                  
                      return [
                        bookmark.id,
                        importId,
                        combinedText,
                        JSON.stringify(images),
                        JSON.stringify(links),
                        JSON.stringify(videos)
                      ];
                    } catch (error) {
                      console.error(`Playwright failed for ${bookmark.url}:`, error.message);
                      return [
                        bookmark.id,
                        importId,
                        `⚠️ Failed to extract content from: ${bookmark.url}`,
                        JSON.stringify([]),
                        JSON.stringify([]),
                        JSON.stringify([])
                      ];
                    }
                  }));

                const insertSql = `
                    INSERT INTO extracted_content 
                    (bookmark_id, import_id, extracted_text, extracted_images, extracted_links, extracted_videos)
                    VALUES ?
                `;

                db.query(insertSql, [insertValues], (err) => {
                    if (err) return res.status(500).json({ error: "Failed to save extracted content" });
                    res.json({ message: "Extraction complete", import_id: importId });
                });
            });
        });
    });
});
// Get all extractions for a specific bookmark
app.get("/api/bookmarks/:id/extractions", (req, res) => {
    const { id } = req.params;

    const sql = `
      SELECT id, created_at 
      FROM extracted_content 
      WHERE bookmark_id = ? 
      ORDER BY created_at DESC
    `;

    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});


      // Get full content of one extraction by its ID
      app.get("/api/extractions/:id", (req, res) => {
          const { id } = req.params;

          const sql = `
        SELECT * 
        FROM extracted_content 
        WHERE id = ?
    `;

          db.query(sql, [id], (err, results) => {
              if (err) return res.status(500).json({ error: "Database error" });
              if (results.length === 0) return res.status(404).json({ error: "Extraction not found" });
              res.json(results[0]);
          });
      });

      // Get all import sessions for the logged-in user
app.get("/api/import-history", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });

  const sql = `
    SELECT id, imported_at 
    FROM import_history 
    WHERE user_id = ? 
    ORDER BY imported_at DESC
  `;

  db.query(sql, [req.session.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// Get bookmarks and extractions for one import session
app.get("/api/import-history/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  const sql = `
    SELECT b.title, b.url, ec.extracted_text, ec.extracted_images, ec.extracted_links, ec.extracted_videos
    FROM import_bookmarks ib
    JOIN bookmarks b ON ib.bookmark_id = b.id
    LEFT JOIN extracted_content ec ON ec.bookmark_id = b.id AND ec.import_id = ?
    WHERE ib.import_id = ? AND b.user_id = ?
  `;

  db.query(sql, [id, id, userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

      app.delete("/api/delete-account", (req, res) => {
        const userId = req.session.user?.id;
        if (!userId) return res.status(401).json({ error: "Not logged in" });
      
        // Order matters: Delete bookmarks, folders, imports, then user
        const deleteQueries = [
          "DELETE FROM extracted_content WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ?)",
          "DELETE FROM import_bookmarks WHERE import_id IN (SELECT id FROM import_history WHERE user_id = ?)",
          "DELETE FROM import_history WHERE user_id = ?",
          "DELETE FROM extraction_preferences WHERE user_id = ?",
          "DELETE FROM bookmarks WHERE user_id = ?",
          "DELETE FROM folders WHERE user_id = ?",
          "DELETE FROM users WHERE id = ?"
        ];
      
        const runDeletes = (index = 0) => {
          if (index >= deleteQueries.length) {
            req.session.destroy();
            return res.json({ message: "Account deleted" });
          }
          db.query(deleteQueries[index], [userId], (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            runDeletes(index + 1);
          });
        };
      
        runDeletes();
      });

      // app.get("/api/import-session/:id", (req, res) => {
      //   const userId = req.session.user.id;
      //   const importId = req.params.id;
      
      //   const sql = `
      //     SELECT ih.imported_at, b.id AS bookmark_id, b.title
      //     FROM import_history ih
      //     JOIN import_bookmarks ib ON ih.id = ib.import_id
      //     JOIN bookmarks b ON b.id = ib.bookmark_id
      //     WHERE ih.id = ? AND ih.user_id = ?
      //   `;
      
      //   db.query(sql, [importId, userId], (err, results) => {
      //     if (err) return res.status(500).json({ error: "Database error" });
      
      //     if (results.length === 0) return res.status(404).json({ error: "Import session not found" });
      
      //     const createdAt = results[0].created_at;
      //     const bookmarks = results.map(r => ({
      //       bookmark_id: r.bookmark_id,
      //       title: r.title,
      //     }));
      
      //     res.json({
      //       created_at: createdAt,
      //       bookmarks: bookmarks
      //     });
      //   });
      // });
      
      
      // 📌 Set or Update Auto Extraction
app.post("/api/auto-extraction", (req, res) => {
  const userId = req.session.user.id;
  const { type, selected, frequencyHours } = req.body;

  if (!type || !frequencyHours) {
    return res.status(400).json({ error: "Missing type or frequencyHours" });
  }

  const bookmarkIds = selected?.join(",") || "";
  const nextRun = new Date(Date.now() + frequencyHours * 3600 * 1000);

  const sql = `
    INSERT INTO auto_extractions (user_id, type, selected_bookmark_ids, frequency_hours, next_run)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      type = VALUES(type),
      selected_bookmark_ids = VALUES(selected_bookmark_ids),
      frequency_hours = VALUES(frequency_hours),
      next_run = VALUES(next_run)
  `;

  db.query(sql, [userId, type, bookmarkIds, frequencyHours, nextRun], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Auto-extraction scheduled successfully" });
  });
});

// 📌 Get Current Auto Extraction Setting
app.get("/api/auto-extractions", (req, res) => {
  const userId = req.session.user.id;

  const sql = `
    SELECT id, name, type, selected_bookmark_ids, frequency_hours, next_run
    FROM auto_extractions
    WHERE user_id = ?
    ORDER BY next_run ASC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// 📌 Create a New Auto Extraction (add a new schedule)
app.post("/api/auto-extractions", (req, res) => {
  const userId = req.session.user.id;
  const { type, selected, frequencyHours } = req.body;

  if (!type || !frequencyHours) {
    return res.status(400).json({ error: "Missing type or frequencyHours" });
  }

  const bookmarkIds = selected?.join(",") || "";
  const nextRun = new Date(Date.now() + frequencyHours * 3600 * 1000);

  const sql = `
    INSERT INTO auto_extractions (user_id, type, selected_bookmark_ids, frequency_hours, next_run)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [userId, type, bookmarkIds, frequencyHours, nextRun], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Auto-extraction scheduled successfully" });
  });
});

// 📌 Delete One Auto Extraction
app.delete("/api/auto-extractions/:id", (req, res) => {
  const userId = req.session.user.id;
  const { id } = req.params;

  db.query(`DELETE FROM auto_extractions WHERE id = ? AND user_id = ?`, [id, userId], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Auto-extraction disabled" });
  });
});

// 📌 Delete All Auto Extractions
app.delete("/api/auto-extractions", (req, res) => {
  const userId = req.session.user.id;

  db.query(`DELETE FROM auto_extractions WHERE user_id = ?`, [userId], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "All auto-extractions disabled" });
  });
});

// 📌 Update an existing Auto Extraction
app.patch("/api/auto-extractions/:id", (req, res) => {
  const userId = req.session.user.id;
  const { id } = req.params;
  const { name, frequencyHours, selected } = req.body;

  const updateFields = [];
  const updateValues = [];

  if (name !== undefined) {
    updateFields.push("name = ?");
    updateValues.push(name);
  }

  if (frequencyHours !== undefined) {
    updateFields.push("frequency_hours = ?");
    updateValues.push(frequencyHours);
  }

  if (selected !== undefined) {
    updateFields.push("selected_bookmark_ids = ?");
    updateValues.push(selected.join(","));
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  updateValues.push(id, userId);

  const sql = `
    UPDATE auto_extractions
    SET ${updateFields.join(", ")}
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, updateValues, (err, result) => {
    if (err) {
      console.error("Error updating auto-extraction:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Auto-extraction updated successfully" });
  });
});



// 🕒 Auto Extraction Cron Job - Runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('🔎 Checking for auto-extractions...');

  const now = new Date();

  db.query(`SELECT * FROM auto_extractions WHERE next_run <= ?`, [now], async (err, rows) => {
    if (err) {
      console.error("Cron DB error:", err);
      return;
    }

    for (const row of rows) {
      const userId = row.user_id;
      let ids = [];

      if (row.type === "all") {
        db.query(`SELECT id FROM bookmarks WHERE user_id = ?`, [userId], async (err, bookmarks) => {
          if (err) return console.error("Failed to load bookmarks:", err);

          ids = bookmarks.map(b => b.id);
          await triggerExtraction(ids, userId, row.id, row.frequency_hours);
        });
      } else if (row.type === "manual") {
        ids = row.selected_bookmark_ids.split(',').map(id => parseInt(id));
        await triggerExtraction(ids, userId, row.id, row.frequency_hours);
      } 
    }
  });
});
const { extractBookmarks } = require('./services/extractionService');
// Helper Function to trigger extraction
async function triggerExtraction(ids, userId, autoExtractionId, frequencyHours) {
  if (!ids || ids.length === 0) {
    console.log(`⚠️ No bookmarks found for user ${userId}`);
    return;
  }

  console.log(`🚀 Auto-extracting for user ${userId} (bookmarks: ${ids.join(", ")})`);

  try {
    await extractBookmarks(ids, userId);

    const nextRun = new Date(Date.now() + frequencyHours * 3600 * 1000);
    db.query(`UPDATE auto_extractions SET next_run = ? WHERE id = ?`, [nextRun, autoExtractionId]);
  } catch (error) {
    console.error(`❌ Auto-extraction failed for user ${userId}:`, error.message);
  }
}

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));