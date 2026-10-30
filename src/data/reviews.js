// Mock customer reviews, keyed by product id. Swap for a database query when reviews go live.
export const reviews = {
  w001: [
    { name: "Brian O.", rating: 5, date: "2026-09-14", title: "Exactly as described", body: "Unworn, stickers still on and the papers dated this year. Delivered to my office in Westlands the same afternoon." },
    { name: "Kevin M.", rating: 5, date: "2026-07-02", title: "Smooth from start to finish", body: "Paid by M-Pesa in two parts and they kept me updated on WhatsApp throughout. The presentation box alone is worth it." },
    { name: "Daniel W.", rating: 4, date: "2026-05-21", title: "Great watch, tight bracelet", body: "Needed a link added, which the salon did for free while I waited. Very happy." },
  ],
  w002: [
    { name: "Ivy N.", rating: 5, date: "2026-08-30", title: "Gift for my husband", body: "They helped me pick between the blue and the black and engraved the caseback. He hasn't taken it off." },
    { name: "Samuel K.", rating: 5, date: "2026-06-11", title: "Best price in Nairobi", body: "Compared three dealers and Edens was the only one with a full set and warranty at this price." },
  ],
  w003: [
    { name: "Achieng O.", rating: 5, date: "2026-10-02", title: "Timeless", body: "Wear it to the office and to dinner. The strap is softer than I expected." },
  ],
  w004: [
    { name: "Private client", rating: 5, date: "2026-03-18", title: "Discreet and professional", body: "Viewed it privately at the salon, authentication report was thorough. Exactly the service you want at this level." },
  ],
  w006: [
    { name: "Faith M.", rating: 5, date: "2026-09-05", title: "That green!", body: "Photos don't do the dial justice. 36 mm is perfect on my wrist." },
    { name: "George T.", rating: 4, date: "2026-04-27", title: "Lovely", body: "Took four days to arrive in Mombasa instead of two but it came fully insured and sealed." },
  ],
  w007: [
    { name: "Eric O.", rating: 5, date: "2026-08-08", title: "Sharp", body: "Great value with the current discount. The movement is lovely through the back." },
  ],
  w011: [
    { name: "Private client", rating: 5, date: "2026-02-09", title: "Immaculate", body: "Condition was better than the listing said. Will buy from Edens again." },
  ],
  w012: [
    { name: "Mercy A.", rating: 5, date: "2026-10-12", title: "My first proper watch", body: "39 mm wears small enough for me and the team explained everything about servicing." },
    { name: "Ken J.", rating: 5, date: "2026-07-19", title: "Daily wearer", body: "Tough, legible, and the five-year warranty gives peace of mind." },
  ],
  w013: [
    { name: "Wanjiru K.", rating: 5, date: "2026-09-22", title: "So much fun", body: "The diamonds moving around never gets old. Beautifully packed." },
  ],
  w016: [
    { name: "Nadia H.", rating: 5, date: "2026-06-03", title: "Looks brand new", body: "Pre-owned but you'd never know. The chocolate dial is gorgeous in person." },
  ],
};

export function reviewsFor(id) {
  return reviews[id] || [];
}

export function ratingSummary(id) {
  const list = reviewsFor(id);
  if (!list.length) return { average: 0, count: 0 };
  return { average: list.reduce((s, r) => s + r.rating, 0) / list.length, count: list.length };
}

// Shown on the home page.
export const testimonials = [
  { name: "Marcus K.", place: "Karen, Nairobi", body: "Edens found me a reference I had been chasing for three years. The authentication was thorough and the box immaculate." },
  { name: "Amira S.", place: "Mombasa", body: "From the first WhatsApp to delivery, everything felt personal. They even sized the bracelet before it shipped." },
  { name: "James O.", place: "Kilimani, Nairobi", body: "Outstanding service and a remarkable selection. Already a repeat client and I've sent two friends." },
];
