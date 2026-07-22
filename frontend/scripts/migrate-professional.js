const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');

const replacements = [
  ['text-cream0', 'text-stone-400'],
  ['text-slate-100', 'text-cream'],
  ['text-slate-50', 'text-cream'],
  ['text-slate-200', 'text-cream'],
  ['text-slate-300', 'text-stone-400'],
  ['text-slate-400', 'text-stone'],
  ['text-slate-500', 'text-stone'],
  ['text-slate-600', 'text-stone-600'],
  ['text-slate-700', 'text-stone-600'],
  ['text-slate-800', 'text-stone-600'],
  ['text-slate-900', 'text-stone-600'],
  ['bg-slate-850', 'bg-surface'],
  ['bg-slate-900', 'bg-surface'],
  ['bg-slate-950', 'bg-ink-deep'],
  ['divide-slate-900', 'divide-line'],
  ['border-slate-900', 'border-line'],
  ['bg-ink/70', 'bg-ink-deep/50'],
  ['bg-ink/60', 'bg-surface'],
  ['bg-ink/40', 'bg-surface'],
  ['bg-ink/30', 'bg-surface'],
  ['bg-ink/20', 'bg-surface'],
  ['bg-ink/10', 'bg-surface'],
  ['rounded-3xl', 'rounded-lg'],
  ['rounded-2xl', 'rounded-lg'],
  ['font-extrabold', 'font-semibold'],
  ['font-black', 'font-semibold'],
  ['font-display', 'font-sans'],
  ['tracking-widest', 'tracking-wide'],
  ['uppercase tracking-wider', 'font-medium'],
  ['bg-gold text-white', 'bg-gold text-white'],
  ['#C8A55A', '#1D4ED8'],
  ['#3D6B5E', '#047857'],
  ['#D4735C', '#DC2626'],
  ['#5A8F7F', '#059669'],
  ['#8B7355', '#64748B'],
  ['#141410', '#FFFFFF'],
  ['#2A2A24', '#E2E8F0'],
  ['#6B675C', '#94A3B8'],
  ['#0f172a', '#F8FAFC'],
  ['#1e293b', '#E2E8F0'],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.jsx')) migrate(full);
  }
}

function migrate(file) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated:', path.relative(appDir, file));
  }
}

walk(appDir);
console.log('Done.');
