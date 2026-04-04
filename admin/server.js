const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');
const dataService = require('./data-service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the admin UI
app.use(express.static(path.join(__dirname, 'public')));
// Serve the media files so admin UI can preview them
app.use('/data', express.static(path.join(__dirname, '..', 'data')));

// Setup Multer for upload to a temp folder first
const upload = multer({ dest: path.join(__dirname, '..', 'uploads', '_temp') });

// API: Get all items
app.get('/api/items', (req, res) => {
    res.json(dataService.getItems());
});

// API: Check for Duplicates
app.get('/api/duplicates', (req, res) => {
    const items = dataService.getItems();
    let duplicateIds = {};
    let duplicateUrls = {};
    let duplicateOriginalNames = {};

    items.forEach(item => {
        if (!duplicateIds[item.id]) duplicateIds[item.id] = [];
        duplicateIds[item.id].push(item.name || "Untitled");

        if (item.url) {
            if (!duplicateUrls[item.url]) duplicateUrls[item.url] = [];
            duplicateUrls[item.url].push(item.id);
        }
        
        if (item.displayName && item.type !== 'folder') {
            if (!duplicateOriginalNames[item.displayName]) duplicateOriginalNames[item.displayName] = [];
            duplicateOriginalNames[item.displayName].push(item.name);
        }
    });

    const dupIds = Object.keys(duplicateIds).filter(id => duplicateIds[id].length > 1).map(id => ({ id, files: duplicateIds[id] }));
    const dupUrls = Object.keys(duplicateUrls).filter(url => duplicateUrls[url].length > 1).map(url => ({ url, ids: duplicateUrls[url] }));
    const dupNames = Object.keys(duplicateOriginalNames).filter(name => duplicateOriginalNames[name].length > 1).map(name => ({ originalName: name, generatedNames: duplicateOriginalNames[name] }));

    res.json({ success: true, dupIds, dupUrls, dupNames });
});

// API: Rename
app.put('/api/items/:id/rename', (req, res) => {
    const id = req.params.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const item = dataService.getItemById(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Since we don't necessarily want to rename the physical file format to avoid breaking URLs (unless it's a folder),
    // we use `displayName` or just change the `name` for folders. Let's fully rename if requested,
    // but for photos it's safer to set `displayName` to not break file links.
    if (item.type === 'folder' || item.type === 'youtube') {
        dataService.updateItem(id, { name });
    } else {
        dataService.updateItem(id, { displayName: name });
    }
    res.json({ success: true });
});

// API: Move
app.put('/api/items/:id/move', (req, res) => {
    const id = req.params.id;
    const { parentId } = req.body;
    
    // validate parentId exists or is null
    if (parentId !== null && !dataService.getItemById(parentId)) {
        return res.status(400).json({ error: 'Invalid parent ID' });
    }
    
    const updated = dataService.updateItem(id, { parentId });
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    
    res.json({ success: true, item: updated });
});

// API: Copy
app.post('/api/items/:id/copy', (req, res) => {
    const id = req.params.id;
    const { parentId } = req.body;
    
    if (parentId !== null && !dataService.getItemById(parentId)) {
        return res.status(400).json({ error: 'Invalid parent ID' });
    }
    
    const copies = dataService.copyItem(id, parentId);
    if (!copies || copies.length === 0) return res.status(404).json({ error: 'Item not found' });
    
    res.json({ success: true, copies });
});

// API: Toggle Favorite / Update Tags
app.put('/api/items/:id/tags', (req, res) => {
    const id = req.params.id;
    const { tags } = req.body; // array of strings
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'Tags must be an array' });

    const updated = dataService.updateItem(id, { tags });
    res.json({ success: true, item: updated });
});

// API: Delete
app.delete('/api/items/:id', (req, res) => {
    const id = req.params.id;
    const deletedItems = dataService.deleteItem(id);
    
    // Remove physical files
    for (let item of deletedItems) {
        if (item.type === 'image' || item.type === 'video') {
            const cleanPath = item.url.startsWith('./') ? item.url.substring(2) : item.url;
            const fullPath = path.join(__dirname, '..', cleanPath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }
    }
    
    res.json({ success: true, deletedCount: deletedItems.length });
});

// API: Add Folder
app.post('/api/folders', (req, res) => {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: "Folder name required" });

    const newItem = {
        id: dataService.generateNextId(),
        name: name,
        type: 'folder',
        parentId: parentId || null,
        url: null,
        downloadUrl: null
    };

    dataService.insertItem(newItem);
    res.json({ success: true, item: newItem });
});

// API: Upload Media
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const { parentId } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    let type = 'unknown';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'].includes(ext)) {
        type = 'image';
    } else if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
        type = 'video';
    }

    if (type === 'unknown') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Unsupported file type' });
    }

    const newName = dataService.generateNextName(type, ext);
    const finalDataPath = path.join(__dirname, '..', 'data', newName);
    const rawFolder = path.join(__dirname, '..', 'data', 'raw');
    if (!fs.existsSync(rawFolder)) fs.mkdirSync(rawFolder, { recursive: true });

    if (type === 'image') {
        const isLarge = req.file.size > 1024 * 1024;
        if (isLarge) {
            const rawPath = path.join(rawFolder, newName);
            fs.copyFileSync(req.file.path, rawPath);
            
            await sharp(rawPath)
                .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80, force: false })
                .toFile(finalDataPath);
        } else {
            fs.copyFileSync(req.file.path, finalDataPath);
        }
    } else if (type === 'video') {
        fs.copyFileSync(req.file.path, finalDataPath);
    }

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    const newItem = {
        id: dataService.generateNextId(),
        name: newName,
        displayName: req.file.originalname, // Store original name as display name
        type: type,
        parentId: parentId === 'null' ? null : (parseInt(parentId) || null),
        url: `./data/${newName}`,
        downloadUrl: `./data/${newName}`
    };

    dataService.insertItem(newItem);
    res.json({ success: true, item: newItem });
});

app.listen(PORT, () => {
    console.log(`Admin Server running on http://localhost:${PORT}`);
});
