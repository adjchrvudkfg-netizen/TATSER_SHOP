// Har product aur package ke hisab se keys ka stock
const keysStock = {
  "phantom_1d": [
    "PHTM-82A6-XYZ1",
    "PHTM-162C-ABC2",
    "PHTM-9982-DEF3"
  ],
  "myth_1h": [
    "MYTH-1111-AAAA",
    "MYTH-2222-BBBB"
  ]
  // Aur bhi keys yahan add kar sakte hain
};

function getNextKey(panelKey, duration) {
  const stockKey = `${panelKey}_${duration}`;
  
  // Agar stock mein keys hain toh pehli key uthakar stock se hata do
  if (keysStock[stockKey] && keysStock[stockKey].length > 0) {
    return keysStock[stockKey].shift(); 
  }
  
  // Agar stock khatam ho jaye, toh automatic backup key generate kar do
  return `TATSER-AUTO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

module.exports = { getNextKey };
