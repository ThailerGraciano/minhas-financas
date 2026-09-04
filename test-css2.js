const fs = require('fs');
const cssPath = 'src/app/globals.css';
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(/max-width: 767px/g, 'max-width: 639px');
fs.writeFileSync(cssPath, css);
console.log("Updated CSS rule");
