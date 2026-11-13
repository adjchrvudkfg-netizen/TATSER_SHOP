// Har panel ke alag-alag prices aur packages
const panelData = {
  prime: {
    title: "PRIME HOOK",
    packages: [
      { hours: "1 Hours", price: 15.00, callback: "buy_prime_1h_15" },
      { hours: "3 Hours", price: 35.00, callback: "buy_prime_3h_35" },
      { hours: "1 Days", price: 90.00, callback: "buy_prime_1d_90" }
    ]
  },
  drip: {
    title: "DRIP WIRE",
    packages: [
      { hours: "1 Hours", price: 10.00, callback: "buy_drip_1h_10" },
      { hours: "3 Hours", price: 25.00, callback: "buy_drip_3h_25" },
      { hours: "1 Days", price: 60.00, callback: "buy_drip_1d_60" }
    ]
  },
  phantom: {
    title: "PHANTOM",
    packages: [
      { hours: "3 Hours", price: 25.00, callback: "buy_phantom_3h_25" },
      { hours: "1 Days", price: 150.00, callback: "buy_phantom_1d_150" },
      { hours: "3 Days", price: 300.00, callback: "buy_phantom_3d_300" }
    ]
  },
  myth: {
    title: "MYTH PANEL",
    packages: [
      { hours: "1 Hours", price: 14.00, callback: "buy_myth_1h_14" },
      { hours: "3 Hours", price: 30.00, callback: "buy_myth_3h_30" },
      { hours: "1 Days", price: 72.00, callback: "buy_myth_1d_72" }
    ]
  }
  // Isi tarah baaki panels bhi add kar sakte hain!
};

module.exports = panelData;
