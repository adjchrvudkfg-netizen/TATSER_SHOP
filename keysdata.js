const keysStore = {
  drake: {
    "1h": [
      "DRAKE-1H-KEY111",
      "DRAKE-1H-KEY222",
      "DRAKE-1H-KEY333" // Aap jitni marzi naye keys yahan add kar sakte hain
    ],
    "3h": [
      "DRAKE-3H-KEY111",
      "DRAKE-3H-KEY222"
    ],
    "6h": [
      "DRAKE-6H-KEY111"
    ]
  },
  myth: {
    "1h": [
      "MYTH-1H-KEY111",
      "MYTH-1H-KEY222"
    ],
    "3h": [
      "MYTH-3H-KEY111"
    ],
    "6h": [
      "MYTH-6H-KEY111"
    ]
  },

  // Yeh function automatic use ki gayi key ko hata dega
  getNextKey(panel, duration) {
    if (this[panel] && this[panel][duration] && this[panel][duration].length > 0) {
      return this[panel][duration].shift();
    }
    return null; // Out of stock
  }
};

module.exports = keysStore;
