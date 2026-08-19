const txDate = "2026-07-15";
const cardClosingDay = 21;
const cardDueDay = 28;

const [pYear, pMonth, pDay] = txDate.split('-').map(Number);
const purchaseDate = new Date(pYear, pMonth - 1, pDay);

const targetDate = new Date(purchaseDate);
if (purchaseDate.getDate() >= cardClosingDay) {
  targetDate.setMonth(targetDate.getMonth() + 1);
}
targetDate.setDate(cardDueDay);

const yStr = targetDate.getFullYear();
const mStr = String(targetDate.getMonth() + 1).padStart(2, "0");
const dStr = String(targetDate.getDate()).padStart(2, "0");
const groupDate = `${yStr}-${mStr}-${dStr}`;

console.log("purchaseDate:", txDate, "groupDate:", groupDate);
