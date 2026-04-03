const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data.json');

let rawData = fs.readFileSync(dataFile, 'utf8');
let items = JSON.parse(rawData);

let originalLength = items.length;

// Filter out any items where the physical file no longer exists
items = items.filter(item => {
    // Keep folders and youtube links
    if (item.type === 'folder' || item.type === 'youtube') return true;
    
    // Check if the physical file exists
    // item.url is something like './data/filename.ext'
    const cleanPath = item.url.startsWith('./') ? item.url.substring(2) : item.url;
    const absolutePath = path.join(__dirname, cleanPath);
    
    return fs.existsSync(absolutePath);
});

if (items.length !== originalLength) {
    fs.writeFileSync(dataFile, JSON.stringify(items, null, 2));
    console.log(`Cleaned up ${originalLength - items.length} broken/duplicate entries!`);
} else {
    console.log("Everything is already clean!");
}
