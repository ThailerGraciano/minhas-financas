const d = new Date(2026, 0, 31); // Jan 31
d.setMonth(d.getMonth() + 1); // Expected: Feb 28 or March 3?
console.log("After setMonth(1):", d.toString());
d.setDate(10);
console.log("After setDate(10):", d.toString());
