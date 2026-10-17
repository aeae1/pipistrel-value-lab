// Execute the production calculation code in Node; no second pricing formula.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function createEngine({source, observations} = {}) {
  const html = fs.readFileSync(path.join(root, 'template.html'), 'utf8');
  const defaults = {};
  const attr = (s, name) => s.match(new RegExp('\\b' + name + '="([^"]*)"'))?.[1];
  for (const m of html.matchAll(/<input\b([^>]*\bdata-persist[^>]*)>/g)) {
    const a = m[1], key = attr(a, 'id'), type = attr(a, 'type');
    const value = attr(a, 'value') ?? '';
    defaults[key] = type === 'checkbox' ? /\bchecked\b/.test(a) : ['number','range'].includes(type) ? (value === '' ? null : +value) : value;
  }
  for (const m of html.matchAll(/<select\b([^>]*\bdata-persist[^>]*)>([\s\S]*?)<\/select>/g)) {
    const opts = [...m[2].matchAll(/<option\b([^>]*)>/g)];
    const selected = opts.find(o => /\bselected\b/.test(o[1])) || opts[0];
    const value = attr(selected[1], 'value');
    defaults[attr(m[1], 'id')] = value !== '' && /^\d+(\.\d+)?$/.test(value) ? +value : value;
  }
  const payload = {observations: observations || JSON.parse(fs.readFileSync(path.join(root,'data/observations.json'))), sources: []};
  const context = vm.createContext({console, Intl, URL, URLSearchParams,
    document: {getElementById: id => id === 'app-data' ? {textContent:JSON.stringify(payload)} : null, querySelectorAll: () => []},
    defaults
  });
  const code = source || fs.readFileSync(path.join(root,'scripts/app.js'),'utf8');
  vm.runInContext(fs.readFileSync(path.join(root,'scripts/visuals.js'),'utf8')+'\n'+code.replace(/\binit\(\);\s*$/, ''), context);
  return {run: expression => vm.runInContext(expression, context), defaults};
}
module.exports = {createEngine};
