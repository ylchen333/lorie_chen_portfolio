// Vanilla JS: work/playlab filters and the playlab lightbox.

// ── Filters (home + playlab) ───────────────────────────────────────────────
document.querySelectorAll('.filters').forEach((group) => {
  const buttons = [...group.querySelectorAll('.filter')];
  const scope = group.closest('section') || document;
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const key = btn.dataset.filter;
      scope.querySelectorAll('[data-cats]').forEach((el) => {
        const cats = el.dataset.cats.split(' ');
        el.hidden = !(key === 'all' || cats.includes(key));
      });
    });
  });
});

// ── Lightbox (playlab experiments + Other work) ────────────────────────────
(() => {
  const triggers = document.querySelectorAll('.open');
  if (!triggers.length) return;

  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image gallery');
  lb.innerHTML = `
    <div class="lb-head">
      <span class="lb-title"></span>
      <span class="lb-tag"></span>
      <span class="lb-count" aria-live="polite"></span>
      <button class="lb-btn lb-close" type="button" aria-label="Close gallery">&times;</button>
    </div>
    <div class="lb-stage">
      <button class="lb-btn lb-prev" type="button" aria-label="Previous image">&larr;</button>
      <img alt="" />
      <button class="lb-btn lb-next" type="button" aria-label="Next image">&rarr;</button>
    </div>
    <div class="lb-thumbs"></div>`;
  document.body.appendChild(lb);

  const $ = (s) => lb.querySelector(s);
  const stageImg = $('.lb-stage img');
  const prevBtn = $('.lb-prev');
  const nextBtn = $('.lb-next');
  const closeBtn = $('.lb-close');
  const thumbs = $('.lb-thumbs');
  let images = [], index = 0, title = '', opener = null;

  function show(i) {
    index = Math.max(0, Math.min(images.length - 1, i));
    stageImg.src = images[index];
    stageImg.alt = `${title}, image ${index + 1} of ${images.length}`;
    $('.lb-count').textContent = `${index + 1} / ${images.length}`;
    prevBtn.setAttribute('aria-disabled', String(index === 0));
    nextBtn.setAttribute('aria-disabled', String(index === images.length - 1));
    [...thumbs.children].forEach((t, n) => {
      if (n === index) { t.setAttribute('aria-current', 'true'); t.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      else t.removeAttribute('aria-current');
    });
  }

  function open(src, i, btn) {
    images = src.dataset.images.split('|');
    title = src.dataset.title || '';
    opener = btn;
    $('.lb-title').textContent = title;
    $('.lb-tag').textContent = src.dataset.tag || '';
    thumbs.innerHTML = '';
    images.forEach((url, n) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'lb-thumb';
      t.setAttribute('aria-label', `Show image ${n + 1}`);
      t.innerHTML = '<img alt="" loading="lazy" decoding="async" />';
      t.firstChild.src = url;
      t.addEventListener('click', () => show(n));
      thumbs.appendChild(t);
    });
    thumbs.hidden = images.length < 2;
    lb.classList.add('open-lb');
    document.body.style.overflow = 'hidden';
    show(i);
    closeBtn.focus();
  }

  function close() {
    lb.classList.remove('open-lb');
    document.body.style.overflow = '';
    stageImg.removeAttribute('src');
    if (opener) opener.focus();
  }

  triggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.closest('[data-images]');
      if (src) open(src, Number(btn.dataset.index || 0), btn);
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); show(index - 1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); show(index + 1); });
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target === $('.lb-stage')) close(); });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open-lb')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'Tab') {
      const f = [...lb.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // swipe on touch screens
  let x0 = null;
  $('.lb-stage').addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  $('.lb-stage').addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
