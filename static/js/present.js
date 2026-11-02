// Present mode: step through the page bullet by bullet (keyboard: right/space = next, left = back, Esc = exit, P = start).
// Steps are built from the page itself, in document order, so the page stays the only source of the content.
(function () {
  const STEP_SEL = [
    'main > section.hero:first-child .column.has-text-centered',
    '.tldr-section .tldr', '.tldr-section .hl-grid', '.tldr-section .jump-cards',
    '#video .container',
    'section > .container > h2.title',
    '#setup h3.title', '#setup .setup-list > li',
    '.takeaways > li > .head',
    '.fa-sub', '.fa-points > li',
    'figure', '.paper-table-wrap', '.paper-table-legend', '.routes',
    '#discussion .discussion p',
    '#explorer > .container',
    '#appendix h3.title', '#appendix .eq', '#appendix .lds-key',
    '#BibTeX > .container',
  ].join(',');
  // Elements that join the previous step instead of making a new one.
  const JOIN_PREV = '.paper-table-legend';

  const css = `
    body.presenting .step-future { opacity: .3; transition: opacity .25s; pointer-events: none; }
    body.presenting .step-past { opacity: 1; transition: opacity .25s; cursor: pointer; }
    body.presenting .step-current { opacity: 1; transition: opacity .25s;
      box-shadow: 0 0 0 3px #2563eb33; border-radius: 6px; background-color: #eff6ff80; }
    body.presenting .scroll-to-top, body.presenting .draft-banner { display: none !important; }
    #present-bar { position: fixed; top: 0; left: 0; height: 4px; background: #2563eb; z-index: 1000;
      transition: width .25s; display: none; }
    #present-hud { position: fixed; left: 1rem; bottom: 1rem; z-index: 1000; display: none; align-items: center;
      gap: .6rem; padding: .45rem .8rem; border-radius: 999px; background: #1a1a1aE6; color: #fff;
      font-size: .82rem; max-width: calc(100vw - 2rem); box-shadow: 0 4px 14px rgb(0 0 0 / .2); }
    #present-hud .crumb { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #present-hud .count { color: #93c5fd; font-variant-numeric: tabular-nums; white-space: nowrap; }
    #present-hud button { background: none; border: 0; color: #fff; cursor: pointer; font-size: .95rem; padding: 0 .2rem; }
    body.presenting #present-bar { display: block; }
    body.presenting #present-hud { display: flex; }
    @media (max-width: 600px) { #present-hud .keys { display: none; } }
  `;

  let steps = [];       // [{els: [Element], crumb: string}]
  let cur = -1;

  function wrapIntroText(li) {
    // Bare text after the finding head (e.g. Finding D intro) becomes part of the head step.
    const nodes = [];
    for (const n of li.childNodes) {
      if (n.nodeType === 1 && n.matches('.fa-sub, .fa-points, figure, .paper-table-wrap, .routes')) break;
      if (n.nodeType === 3 && n.textContent.trim()) nodes.push(n);
    }
    return nodes.map(n => {
      const s = document.createElement('span');
      n.replaceWith(s); s.appendChild(n); return s;
    });
  }

  function text(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function build() {
    if (steps.length) return;
    const all = Array.from(document.querySelectorAll(STEP_SEL));
    const picked = all.filter(el => !all.some(o => o !== el && o.contains(el)));
    let lastSub = {};
    for (const el of picked) {
      if (el.matches(JOIN_PREV) && steps.length) { steps[steps.length - 1].els.push(el); continue; }
      const els = [el];
      const finding = el.closest('.takeaways > li');
      if (el.matches('.takeaways > li > .head')) {
        els.push(...finding.querySelectorAll(':scope > .finding-icon, :scope > .finding-tag'));
        els.push(...wrapIntroText(finding));
        lastSub[finding.id] = '';
      }
      if (el.matches('.fa-sub') && finding) lastSub[finding.id] = text(el);
      const sec = el.closest('section');
      const h2 = sec && sec.querySelector('h2.title');
      const parts = [h2 ? text(h2) : sec && sec.id === 'video' ? 'Video'
        : sec && sec.classList.contains('tldr-section') ? 'TL;DR' : 'Title'];
      if (finding) {
        parts.push(text(finding.querySelector('.finding-tag')));
        if (lastSub[finding.id]) parts.push(lastSub[finding.id]);
      } else if (sec && sec.id === 'appendix') {
        const h3s = Array.from(sec.querySelectorAll('h3.title')).filter(h =>
          h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING || h === el);
        if (h3s.length) parts.push(text(h3s[h3s.length - 1]));
      }
      steps.push({ els, crumb: parts.filter(Boolean).join(' › ') });
    }
    steps.forEach((s, i) => s.els.forEach(e => { e.dataset.presentStep = i; }));
  }

  function render(scroll = true) {
    steps.forEach((s, i) => s.els.forEach(e => {
      e.classList.toggle('step-past', i < cur);
      e.classList.toggle('step-current', i === cur);
      e.classList.toggle('step-future', i > cur);
    }));
    const s = steps[cur];
    document.getElementById('present-bar').style.width = `${(100 * (cur + 1)) / steps.length}%`;
    document.querySelector('#present-hud .crumb').textContent = s.crumb;
    document.querySelector('#present-hud .count').textContent = `${cur + 1} / ${steps.length}`;
    history.replaceState(null, '', `#step=${cur + 1}`);
    if (scroll) {
      const el = s.els[0];
      const tall = el.getBoundingClientRect().height > window.innerHeight * 0.8;
      el.scrollIntoView({ behavior: 'smooth', block: tall ? 'start' : 'center' });
    }
  }

  function go(i) { cur = Math.max(0, Math.min(steps.length - 1, i)); render(); }

  function start(i = 0) {
    build();
    document.body.classList.add('presenting');
    go(i);
  }

  function stop() {
    document.body.classList.remove('presenting');
    steps.forEach(s => s.els.forEach(e => e.classList.remove('step-past', 'step-current', 'step-future')));
    history.replaceState(null, '', location.pathname + location.search);
  }

  function presenting() { return document.body.classList.contains('presenting'); }

  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!presenting()) {
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); start(0); }
      return;
    }
    const next = ['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'];
    const prev = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'];
    if (next.includes(e.key)) { e.preventDefault(); go(cur + 1); }
    else if (prev.includes(e.key)) { e.preventDefault(); go(cur - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(steps.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); stop(); }
  });

  document.addEventListener('click', e => {
    if (!presenting()) return;
    const el = e.target.closest('.step-past');
    if (el && !e.target.closest('a, button, select, video')) go(+el.dataset.presentStep);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    const bar = document.createElement('div'); bar.id = 'present-bar';
    const hud = document.createElement('div'); hud.id = 'present-hud';
    hud.innerHTML = '<button title="Back (←)" aria-label="Previous step">&#8592;</button>' +
      '<span class="count"></span><span class="crumb"></span>' +
      '<span class="keys" style="opacity:.6">← → Esc</span>' +
      '<button title="Next (→)" aria-label="Next step">&#8594;</button>' +
      '<button title="Exit (Esc)" aria-label="Exit present mode">&#10005;</button>';
    const [bPrev, bNext, bExit] = hud.querySelectorAll('button');
    bPrev.onclick = () => go(cur - 1); bNext.onclick = () => go(cur + 1); bExit.onclick = stop;
    document.body.append(bar, hud);
    const btn = document.getElementById('present-btn');
    if (btn) btn.addEventListener('click', e => { e.preventDefault(); start(0); });
    const m = location.hash.match(/^#step=(\d+)$/);
    if (m) setTimeout(() => start(+m[1] - 1), 300);
  });
})();
