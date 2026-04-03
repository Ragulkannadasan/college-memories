const fs = require('fs');
const path = require('path');

let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.error("❌ The 'sharp' library is required. Please wait for npm install to finish or run: npm install sharp");
    process.exit(1);
}

const dataFile = path.join(__dirname, 'data.json');
const mediaFolder = path.join(__dirname, 'data');
const rawFolder = path.join(__dirname, 'data', 'raw');
const uploadsFolder = path.join(__dirname, 'uploads');

// Ensure necessary directories exist
if (!fs.existsSync(rawFolder)) fs.mkdirSync(rawFolder, { recursive: true });
if (!fs.existsSync(uploadsFolder)) fs.mkdirSync(uploadsFolder, { recursive: true });

async function processMedia() {
    console.log("scanning uploads/ folder...");
    
    // 1. Read existing data.json
    let rawData = fs.readFileSync(dataFile, 'utf8');
    let items = JSON.parse(rawData);

    // 2. Read all files in uploads
    let files = [];
    try {
        files = fs.readdirSync(uploadsFolder);
    } catch(e) {
        console.log("No uploads folder found. Creating one...");
        fs.mkdirSync(uploadsFolder);
    }
    
    if (files.length === 0) {
        console.log(`✨ You're all caught up! No files found in "uploads/". Drop photos there first!`);
        return;
    }

    // 3. Find the highest ID and highest Sequence number
    let maxImgSeq = 0;
    let maxVidSeq = 0;
    let maxId = 0;
    let lastFolderIndex = -1;

    items.forEach((item, index) => {
        if (item.id && typeof item.id === 'number' && item.id > maxId) {
            maxId = item.id;
        }
        if (item.type === 'folder' || item.type === 'youtube') {
            lastFolderIndex = index;
        }

        // Parse sequences like img_0257.jpeg
        const matchImg = item.name.match(/^img_(\d+)/i);
        if (matchImg) {
            const seq = parseInt(matchImg[1], 10);
            if (seq > maxImgSeq) maxImgSeq = seq;
        }

        // Parse sequences like vid_0001.mp4
        const matchVid = item.name.match(/^vid_(\d+)/i);
        if (matchVid) {
            const seq = parseInt(matchVid[1], 10);
            if (seq > maxVidSeq) maxVidSeq = seq;
        }
    });

    let addedCount = 0;
    let newItems = [];

    // 4. Process files sequentially to handle async compression
    for (const file of files) {
        if (file.startsWith('.') || file.endsWith('.json') || file.endsWith('.md')) continue;

        const ext = path.extname(file).toLowerCase();
        let type = 'unknown';

        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'].includes(ext)) {
            type = 'image';
        } else if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
            type = 'video';
        }

        if (type === 'unknown') {
            console.warn(`⚠️  Skipping ${file}: unknown/unsupported file type.`);
            continue;
        }

        // Generate the strict new sequence name
        let newName = '';
        if (type === 'image') {
            maxImgSeq++;
            newName = `img_${String(maxImgSeq).padStart(4, '0')}${ext}`;
        } else if (type === 'video') {
            maxVidSeq++;
            newName = `vid_${String(maxVidSeq).padStart(4, '0')}${ext}`;
        }

        const oldPath = path.join(uploadsFolder, file);
        const finalDataPath = path.join(mediaFolder, newName);
        const rawPath = path.join(rawFolder, newName);

        if (type === 'image') {
            const stats = fs.statSync(oldPath);
            const isLarge = stats.size > 1024 * 1024; // 1MB threshold

            if (isLarge) {
                // Move original to data/raw/
                fs.renameSync(oldPath, rawPath);
                
                // Compress and save directly into data/
                console.log(`⌛ Compressing large image: ${file} (to be saved as ${newName}) ...`);
                try {
                    await sharp(rawPath)
                        // Resize down if too monstrous, quality set to 80 (force: false keeps PNGs intact if necessary)
                        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 80, force: false }) 
                        .toFile(finalDataPath);
                    console.log(`✅ Optimized & saved: ${newName} (Original kept in data/raw/)`);
                } catch (err) {
                    console.error(`❌ Error compressing ${file}:`, err.message);
                    // Put original back if compression failed so we don't lose it
                    fs.renameSync(rawPath, oldPath); 
                    continue; 
                }
            } else {
                // Small enough image, move straight to data/
                fs.renameSync(oldPath, finalDataPath);
                console.log(`✅ Saved (No compress needed): ${newName}`);
            }
        } else if (type === 'video') {
            // Videos are simply moved to data/ with their new standard name
            fs.renameSync(oldPath, finalDataPath);
            console.log(`✅ Saved Video: ${newName}`);
        }

        maxId++;
        const newItem = {
            id: maxId,
            name: newName,
            type: type,
            parentId: null, // Inserted in the Root Home folder
            url: `./data/${newName}`,
            downloadUrl: `./data/${newName}`
        };

        newItems.push(newItem);
        addedCount++;
    }

    if (addedCount > 0) {
        // Insert new media dynamically right after the folders
        items.splice(lastFolderIndex + 1, 0, ...newItems);
        
        // Write the database
        fs.writeFileSync(dataFile, JSON.stringify(items, null, 2));

        console.log(`\n🎉 Success! Added ${addedCount} new media files.`);
        console.log(`All organized entries were saved into data.json.`);
    }
}

// Run the asynchronous processing
processMedia().catch(console.error);
