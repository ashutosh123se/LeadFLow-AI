const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app', 'dashboard');

const replacements = [
  ['bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700', 'bg-gold hover:bg-gold-light text-ink'],
  ['bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-750', 'bg-gold hover:bg-gold-light text-ink'],
  ['bg-gradient-to-r from-indigo-500 to-purple-600', 'bg-gold text-ink'],
  ['bg-gradient-to-tr from-indigo-500 to-purple-600', 'bg-gold'],
  ['bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent', 'text-gold'],
  ['bg-gradient-to-r from-indigo-500/10 to-purple-600/10', 'bg-gold-muted'],
  ['bg-indigo-650', 'bg-gold'],
  ['hover:bg-indigo-700', 'hover:bg-gold-light'],
  ['border-slate-850', 'border-line'],
  ['bg-slate-950/70', 'bg-ink/70'],
  ['bg-slate-950/60', 'bg-ink/60'],
  ['bg-slate-950/40', 'bg-ink/40'],
  ['bg-slate-950/30', 'bg-ink/30'],
  ['bg-slate-950/20', 'bg-ink/20'],
  ['bg-slate-950/10', 'bg-ink/10'],
  ['bg-slate-950', 'bg-ink'],
  ['bg-slate-900/60', 'bg-canvas/60'],
  ['bg-slate-900/50', 'bg-canvas/50'],
  ['bg-slate-900/40', 'bg-canvas/40'],
  ['bg-slate-900/30', 'bg-canvas/30'],
  ['bg-slate-900/20', 'bg-canvas/20'],
  ['bg-slate-900/10', 'bg-canvas/10'],
  ['bg-slate-900', 'bg-canvas'],
  ['bg-slate-800', 'bg-surface'],
  ['border-slate-900/80', 'border-line/80'],
  ['border-slate-900/60', 'border-line/60'],
  ['border-slate-900', 'border-line'],
  ['border-slate-800', 'border-line'],
  ['border-slate-700', 'border-line'],
  ['text-slate-350', 'text-stone'],
  ['text-slate-50', 'text-cream'],
  ['text-slate-200', 'text-cream'],
  ['text-slate-300', 'text-stone-400'],
  ['text-slate-400', 'text-stone'],
  ['text-slate-500', 'text-stone'],
  ['text-slate-600', 'text-stone-600'],
  ['text-indigo-300', 'text-gold-light'],
  ['text-indigo-400', 'text-gold'],
  ['text-indigo-500', 'text-gold'],
  ['bg-indigo-950/20', 'bg-gold-muted'],
  ['bg-indigo-950/10', 'bg-gold-muted'],
  ['bg-indigo-500/10', 'bg-gold-muted'],
  ['bg-indigo-500', 'bg-gold'],
  ['bg-indigo-600', 'bg-gold'],
  ['border-indigo-500/30', 'border-gold/30'],
  ['border-indigo-500/20', 'border-gold/20'],
  ['border-indigo-500', 'border-gold'],
  ['border-2 border-indigo-500', 'border-2 border-gold'],
  ['focus:border-indigo-500', 'focus:border-gold'],
  ['hover:text-indigo-400', 'hover:text-gold'],
  ['hover:text-indigo-300', 'hover:text-gold-light'],
  ['hover:border-indigo-500', 'hover:border-gold'],
  ['text-purple-400', 'text-sage-light'],
  ['bg-purple-500/10', 'bg-sage-muted'],
  ['bg-purple-600', 'bg-sage'],
  ['text-teal-400', 'text-sage-light'],
  ['bg-teal-500/10', 'bg-sage-muted'],
  ['text-pink-400', 'text-terracotta'],
  ['bg-pink-500/10', 'bg-terracotta-muted'],
  ['shadow-indigo-500/25', 'shadow-gold/25'],
  ['shadow-indigo-500/20', 'shadow-gold/20'],
  ['shadow-indigo-500/10', 'shadow-gold/10'],
  ['#6366f1', '#C8A55A'],
  ['#a855f7', '#3D6B5E'],
  ['#ec4899', '#D4735C'],
  ['#14b8a6', '#5A8F7F'],
  ['#f59e0b', '#8B7355'],
  ['#0f172a', '#141410'],
  ['#1e293b', '#2A2A24'],
  ['#475569', '#6B675C'],
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
