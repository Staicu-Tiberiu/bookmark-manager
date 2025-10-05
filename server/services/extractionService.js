const { chromium } = require('playwright');
const mysql = require("mysql2");
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bookmarksapp",
}); 

async function extractBookmarks(ids, userId) {
  // Create import session
  return new Promise((resolve, reject) => {
    db.query("INSERT INTO import_history (user_id) VALUES (?)", [userId], (err, result) => {
      if (err) return reject("Failed to create import session");

      const importId = result.insertId;

      const values = ids.map(id => [importId, id]);
      db.query("INSERT INTO import_bookmarks (import_id, bookmark_id) VALUES ?", [values], async (err) => {
        if (err) return reject("Failed to log bookmarks");

        const placeholders = ids.map(() => '?').join(',');
        db.query(`SELECT * FROM bookmarks WHERE id IN (${placeholders})`, ids, async (err, bookmarks) => {
          if (err) return reject("Failed to load bookmarks");

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
            if (err) return reject("Failed to save extracted content");
            resolve({ message: "Extraction complete", import_id: importId });
          });
        });
      });
    });
  });
}

module.exports = { extractBookmarks };
