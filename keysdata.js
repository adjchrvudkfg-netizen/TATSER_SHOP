const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'keysdata.json'); // JSON format mein permanent save karne ke liye

let keysStore = {
  drake: {
    "1h": ["DRAKE-1H-KEY111", "DRAKE-1H-KEY222", "DRAKE-1H-KEY333"],
    "3h": ["DRAKE-3H-KEY111", "DRAKE-3H-KEY222"],
    "6h": ["DRAKE-6H-KEY111"]
  },
  myth: {
    "1h": ["MYTH-1H-KEY111", "MYTH-1H-KEY222"],
    "3h": ["MYTH-3H-KEY111"],
    "6h": ["MYTH-6H-KEY111"]
  }
};

// Load saved keys if file exists
try {
  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath, 'utf8');
    keysStore = JSON.parse(rawData);
  }
} catch (e) {}

// Function to get and permanently remove key from storage
keysStore.getNextKey = function(panel, duration) {
  if (this[panel] && this[panel][duration] && this[panel][duration].length > 0) {
    const key = this[panel][duration].shift(); // First key nikal li
    
    // Permanently save the updated array to file
    try {
      fs.writeFileSync(filePath, JSON.stringify(this, null, 2), 'utf8');
    } catch (e) {}

    return key;
  }
  return null; // Out of stock
};

module.exports = keysStore;
