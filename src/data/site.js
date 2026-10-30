// Store-wide details used by the header, footer, checkout and policy pages.
export const site = {
  name: "Edens Watches",
  tagline: "Rare & luxury timepieces, Nairobi",
  phone: "+254 700 000 000",
  whatsapp: "254700000000", // digits only, for wa.me links
  email: "concierge@edenswatches.co.ke",
  address: "14 Limuru Road, Nairobi, Kenya",
  hours: "Mon – Sat, 10:00 – 19:00",
  socials: {
    instagram: "https://instagram.com/",
    x: "https://x.com/",
    tiktok: "https://tiktok.com/",
  },
};

export const announcements = [
  "Free same-day delivery within Nairobi",
  "Every watch authenticated & certified",
  "Pay by M-Pesa, card or bank transfer",
  "Up to 5-year Edens warranty",
  "Private viewings at our Limuru Road salon",
];

// Delivery options shown at checkout. Fees are in KES.
export const deliveryOptions = [
  { id: "nairobi", label: "Nairobi same-day", note: "Order before 2pm, insured courier", fee: 0 },
  { id: "countrywide", label: "Countrywide", note: "1 – 2 business days, fully insured", fee: 1500 },
  { id: "pickup", label: "Salon pickup", note: "14 Limuru Road, by appointment", fee: 0 },
];

export const paymentOptions = [
  { id: "mpesa", label: "M-Pesa", note: "You'll get an STK prompt or Paybill details" },
  { id: "card", label: "Card", note: "Visa, Mastercard, Amex" },
  { id: "bank", label: "Bank transfer", note: "For orders above KSh 1,000,000" },
];
