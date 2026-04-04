const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data.json');

const readData = () => {
    try {
        const raw = fs.readFileSync(dataFile, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error reading data:", e);
        return [];
    }
};

const writeData = (data) => {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

const getItems = () => {
    return readData();
};

const getItemById = (id) => {
    return readData().find(i => i.id === parseInt(id));
};

const updateItem = (id, updates) => {
    const data = readData();
    const idx = data.findIndex(i => i.id === parseInt(id));
    if (idx !== -1) {
        data[idx] = { ...data[idx], ...updates };
        writeData(data);
        return data[idx];
    }
    return null;
};

const deleteItemRecursive = (data, id) => {
    let idsToDelete = new Set([parseInt(id)]);
    let lengthBefore = 0;
    
    // Find all children recursively
    while(idsToDelete.size !== lengthBefore) {
        lengthBefore = idsToDelete.size;
        for (let item of data) {
            if (idsToDelete.has(item.parentId)) {
                idsToDelete.add(item.id);
            }
        }
    }
    
    // Return filtered array and the items that are deleted (so we can delete files)
    const deletedItems = data.filter(i => idsToDelete.has(i.id));
    const keptItems = data.filter(i => !idsToDelete.has(i.id));
    
    return { keptItems, deletedItems };
};

const deleteItem = (id) => {
    const data = readData();
    const { keptItems, deletedItems } = deleteItemRecursive(data, id);
    writeData(keptItems);
    return deletedItems;
};

const generateNextId = () => {
    const data = readData();
    let maxId = 0;
    for (let item of data) {
        if (item.id > maxId) maxId = item.id;
    }
    return maxId + 1;
};

const generateNextName = (type, ext) => {
    const data = readData();
    let maxSeq = 0;
    const prefix = type === 'image' ? 'img_' : 'vid_';
    
    for (let item of data) {
        if (item.name.startsWith(prefix)) {
            const match = item.name.match(new RegExp(`^${prefix}(\\d+)`, 'i'));
            if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        }
    }
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}${ext}`;
};

const insertItem = (newItem) => {
    const data = readData();
    // Insert new item right after the last folder to maintain some order, else append
    let lastFolderIdx = -1;
    for (let i = 0; i < data.length; i++) {
        if (data[i].type === 'folder' || data[i].type === 'youtube') lastFolderIdx = i;
    }
    data.splice(lastFolderIdx + 1, 0, newItem);
    writeData(data);
};

const copyItem = (itemId, targetParentId) => {
    const data = readData();
    const sourceItem = data.find(i => i.id === parseInt(itemId));
    if (!sourceItem) return [];

    let copies = [];
    
    const duplicateNode = (node, pId, isRoot = false) => {
        let newObject = { ...node };
        const dataRefForNextId = readData();
        const nextId = dataRefForNextId.length > 0 ? Math.max(...dataRefForNextId.map(d=>d.id)) + 1 : 1;
        newObject.id = nextId;
        newObject.parentId = pId;

        if (node.type === 'image' || node.type === 'video') {
            const ext = path.extname(node.url).toLowerCase() || '';
            const newName = generateNextName(node.type, ext);
            
            const oldCleanPath = node.url.startsWith('./') ? node.url.substring(2) : node.url;
            const fullOldPath = path.join(__dirname, '..', oldCleanPath);
            const finalDataPath = path.join(__dirname, '..', 'data', newName);
            
            if (fs.existsSync(fullOldPath)) {
                fs.copyFileSync(fullOldPath, finalDataPath);
            }
            newObject.name = newName;
            newObject.url = `./data/${newName}`;
            newObject.downloadUrl = `./data/${newName}`;
            
            if (isRoot) {
                if (node.displayName) newObject.displayName = node.displayName + ' (Copy)';
                else newObject.displayName = node.name + ' (Copy)';
            }
        } else if (node.type === 'folder' || node.type === 'youtube') {
            if (isRoot) {
                if (node.displayName) newObject.displayName = node.displayName + ' (Copy)';
                else newObject.name = node.name + ' (Copy)';
            }
        }

        insertItem(newObject);
        copies.push(newObject);

        const children = data.filter(i => i.parentId === node.id);
        for (let child of children) {
            duplicateNode(child, newObject.id, false);
        }
    };

    duplicateNode(sourceItem, targetParentId, true);
    return copies;
};

module.exports = {
    getItems,
    getItemById,
    updateItem,
    deleteItem,
    copyItem,
    generateNextId,
    generateNextName,
    insertItem,
    readData,
    writeData
};
