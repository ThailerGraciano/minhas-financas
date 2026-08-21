const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('src/components', (file) => {
  if (!file.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Fix CartesianGrid
  const gridRegex = /<CartesianGrid[^>]*\/>/g;
  content = content.replace(gridRegex, match => {
    if (!match.includes('rgba(255,255,255,0.05)')) {
      changed = true;
      return `<CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />`;
    }
    return match;
  });

  // 2. Add defs to AreaChart if it doesn't have one and has Area
  if (content.includes('<AreaChart') && !content.includes('<defs>')) {
    const areaChartRegex = /(<AreaChart[^>]*>)/;
    content = content.replace(areaChartRegex, `$1\n        <defs>\n          <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">\n            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>\n            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>\n          </linearGradient>\n        </defs>`);
    changed = true;
  }

  // 3. Fix Area styles
  const areaRegex = /<Area\s+([^>]*)\/>/g;
  content = content.replace(areaRegex, (match, props) => {
    if (!props.includes('fill="url(#colorPrimary)"')) {
      let newProps = props
        .replace(/stroke="[^"]*"/g, '')
        .replace(/fill="[^"]*"/g, '')
        .replace(/stroke=\{[^}]*\}/g, '')
        .replace(/fill=\{[^}]*\}/g, '')
        .replace(/fillOpacity=\{[^}]*\}/g, '')
        .replace(/fillOpacity="[^"]*"/g, '');
      
      if (!newProps.includes('type=')) {
        newProps = `type="monotone" ` + newProps;
      } else {
        newProps = newProps.replace(/type="[^"]*"/, 'type="monotone"');
      }
      
      newProps += ' stroke="var(--primary)" fill="url(#colorPrimary)"';
      changed = true;
      return `<Area ${newProps.trim().replace(/\s+/g, ' ')} />`;
    }
    return match;
  });

  // 4. Fix Bar borders
  const barRegex = /<Bar\s+([^>]*)\/>/g;
  content = content.replace(barRegex, (match, props) => {
    if (!props.includes('stroke="transparent"')) {
      let newProps = props.replace(/stroke="[^"]*"/g, '').replace(/stroke=\{[^}]*\}/g, '');
      newProps += ' stroke="transparent"';
      changed = true;
      return `<Bar ${newProps.trim().replace(/\s+/g, ' ')} />`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
