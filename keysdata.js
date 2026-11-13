const keysStock = {
  "myth_1h": ["MYTH-1H-AAAA", "MYTH-1H-BBBB"],
  "myth_3h": ["MYTH-3H-CCCC", "MYTH-3H-DDDD"],
  "myth_6h": ["MYTH-6H-EEEE", "MYTH-6H-FFFF"],
  "drake_1h": ["DRKE-1H-1111", "DRKE-1H-2222"],
  "drake_3h": ["DRKE-3H-3333", "DRKE-3H-4444"],
  "drake_6h": ["DRKE-6H-5555", "DRKE-6H-6666"]
};

function getNextKey(panelKey, duration) {
  const stockKey = `${panelKey}_${duration}`;
  if (keysStock[stockKey] && keysStock[stockKey].length > 0) {
    return keysStock[stockKey].shift();
  }
  return `TATSER-AUTO-${panelKey.toUpperCase()}-${duration.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

module.exports = { getNextKey };
