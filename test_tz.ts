import { parseISO } from 'date-fns';

const txDate = "2026-08-03";
const parsed = parseISO(txDate);
console.log("Parsed ISO:", parsed.toISOString());
console.log("Local getDate():", parsed.getDate());

const [y, m, d] = txDate.split('-').map(Number);
const localDate = new Date(y, m - 1, d);
console.log("Local split:", localDate.toString());
console.log("Split getDate():", localDate.getDate());
