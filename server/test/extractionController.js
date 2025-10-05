const db = require("../db"); // adjust path if needed
const { extractContentFromUrl } = require("../utils/extractor");

exports.extractAndSaveContent = async (req, res) => {
    const { bookmarks } = req.body;

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
        return res.status(400).json({ error: "No bookmarks provided." });
    }

    try {
        const results = [];

        for (const bookmark of bookmarks) {
            const data = await extractContentFromUrl(bookmark.url);

            await db.query(
                `INSERT INTO extracted_content 
                 (bookmark_id, extracted_text, extracted_images, extracted_links, extracted_videos)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    bookmark.id,
                    data.text || "",
                    JSON.stringify(data.images || []),
                    JSON.stringify(data.links || []),
                    JSON.stringify(data.videos || [])
                ]
            );

            results.push({ id: bookmark.id, ...data });
        }

        res.status(200).json({ success: true, extracted: results });
    } catch (err) {
        console.error("Extraction failed:", err);
        res.status(500).json({ error: "Extraction failed." });
    }
};
