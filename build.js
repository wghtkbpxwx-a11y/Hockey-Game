/**
 * Bundles the game into one self-contained HTML file.
 *
 *   node build.js            -> dist/slapshot.html
 *
 * The output has no external references of any kind: styles, all six scripts,
 * and the (code-drawn) artwork are inlined, so the single file plays offline,
 * from a USB stick, or anywhere a strict content-security-policy forbids
 * loading from other hosts.
 *
 * Pass --fragment to emit body content only (no <!doctype>/<html>/<head>),
 * for hosts that supply their own document skeleton.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fragment = process.argv.includes('--fragment');

/* ---- pull the pieces out of index.html ---------------------------------- */

const styleMatch = SRC.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error('no <style> block found in index.html');
const css = styleMatch[1];

const bodyMatch = SRC.match(/<body>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error('no <body> found in index.html');
let body = bodyMatch[1];

const titleMatch = SRC.match(/<title>([\s\S]*?)<\/title>/);
const title = titleMatch ? titleMatch[1].trim() : 'Slapshot Arcade Hockey';

/* ---- inline every script, in the order index.html declares them ---------- */

const scripts = [];
body = body.replace(/[ \t]*<script src="([^"]+)"><\/script>\n?/g, (_, src) => {
  const file = path.join(ROOT, src);
  let code = fs.readFileSync(file, 'utf8');
  // A closing tag inside a string literal would end the inline <script> early.
  code = code.replace(/<\/script>/gi, '<\\/script>');
  scripts.push(`<!-- ${src} -->\n<script>\n${code}\n</script>`);
  return '';
});
if (scripts.length === 0) throw new Error('no <script src> tags found to inline');

/* ---- viewport + iOS meta, applied at runtime ----------------------------- */
/* A host-supplied <head> is not ours to edit, so the tags that matter for
   phones are set from script instead. */

const bootstrap = `<script>
(function () {
  var metas = {
    'viewport': 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black',
    'apple-mobile-web-app-title': 'Slapshot',
    'theme-color': '#04070c'
  };
  for (var name in metas) {
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', metas[name]);
  }
  if (!document.title) document.title = ${JSON.stringify(title)};
  // Embedded in a frame, keystrokes only arrive once the frame has focus.
  addEventListener('pointerdown', function () {
    try { window.focus(); } catch (e) { /* cross-origin parent */ }
  });
})();
</script>`;

/* ---- assemble ------------------------------------------------------------ */

const inner = [
  `<title>${title}</title>`,
  bootstrap,
  `<style>\n${css}\n</style>`,
  body.trim(),
  scripts.join('\n\n'),
].join('\n\n');

const out = fragment ? inner : `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
</head>
<body>
${inner}
</body>
</html>`;

const dist = path.join(ROOT, 'dist');
fs.mkdirSync(dist, { recursive: true });
const target = path.join(dist, fragment ? 'slapshot.fragment.html' : 'slapshot.html');
fs.writeFileSync(target, out);

console.log(`${path.relative(ROOT, target)}  ${(out.length / 1024).toFixed(0)} KB  (${scripts.length} scripts inlined)`);
