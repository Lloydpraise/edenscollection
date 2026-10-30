// Line icons shared by the React components. 24px grid, 1.5 stroke.
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const BagIcon = (p) => (
  <svg {...base} {...p}><path d="M5.5 8h13l-1 12.2a1 1 0 0 1-1 .8h-9a1 1 0 0 1-1-.8L5.5 8Z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></svg>
);
export const HeartIcon = ({ filled, ...p }) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" /></svg>
);
export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const CloseIcon = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const MinusIcon = (p) => (
  <svg {...base} {...p}><path d="M6 12h12" /></svg>
);
export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M12 6v12M6 12h12" /></svg>
);
export const ShieldIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3 5 6v5.5c0 4.3 3 7.7 7 9.5 4-1.8 7-5.2 7-9.5V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const TruckIcon = (p) => (
  <svg {...base} {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></svg>
);
export const WhatsAppIcon = (p) => (
  <svg {...base} {...p}><path d="M4.5 19.5 5.6 16A7.8 7.8 0 1 1 8.4 18.6l-3.9.9Z" /><path d="M9.3 8.6c.2-.4.5-.4.8-.4h.4c.2 0 .4.1.5.4l.6 1.4c0 .2 0 .4-.1.5l-.5.6c.6 1.2 1.6 2.1 2.8 2.7l.6-.6c.2-.1.4-.2.6-.1l1.4.6c.2.1.3.3.3.5v.4c0 .5-.4 1-.9 1.1-2.9.6-6.5-2.8-6.3-5.6 0-.2.1-.4.2-.5Z" /></svg>
);
export const CheckIcon = (p) => (
  <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const StarIcon = ({ filled = true, ...p }) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"} strokeWidth={1.2}><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6Z" /></svg>
);
