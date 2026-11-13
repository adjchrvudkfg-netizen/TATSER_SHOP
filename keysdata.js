const keysStore = {
  drake: {
    "1h": ["DRAKE-1H-KEY111"],
    "3h": ["DRAKE-3H-KEY111"],
    "6h": ["DRAKE-6H-KEY111"]
  },
  myth: {
    "1h": ["MYTH-1H-KEY111"],
    "3h": ["MYTH-3H-KEY111"],
    "6h": ["MYTH-6H-KEY111"]
  },

  getNextKey(panel, duration) {
    if (this[panel] && this[panel][duration] && this[panel][duration].length > 0) {
      return this[panel][duration].shift();
    }
    return null;
  }
};

module.exports = keysStore;
