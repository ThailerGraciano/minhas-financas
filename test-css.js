const fs = require('fs');
const cssPath = 'src/app/globals.css';
let css = fs.readFileSync(cssPath, 'utf8');

const newRule = `
@media (max-width: 767px) {
  main .bg-card {
    margin-left: -1rem;
    margin-right: -1rem;
    width: calc(100% + 2rem) !important;
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
  }
}
`;

if (!css.includes('main .bg-card')) {
  fs.writeFileSync(cssPath, css + newRule);
  console.log("Added CSS rule");
}
