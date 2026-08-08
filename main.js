// ── Carousel ──────────────────────────────────────────────────────────────
document.querySelectorAll('.carousel-wrap').forEach(wrap => {
  const viewport = wrap.querySelector('.carousel');
  const track = wrap.querySelector('.carousel-track');
  if (!viewport || !track) return;
  const items = [...track.children];
  let current = 0;

  function visible() { return window.innerWidth < 600 ? 1 : 3; }

  function move(dir) {
    current = items.reduce((nearest, item, index) => (
      Math.abs(item.offsetLeft - viewport.scrollLeft)
        < Math.abs(items[nearest].offsetLeft - viewport.scrollLeft)
        ? index
        : nearest
    ), 0);
    const max = Math.max(0, items.length - visible());
    current = Math.max(0, Math.min(max, current + dir));
    viewport.scrollTo({ left: items[current].offsetLeft, behavior: 'smooth' });
  }

  wrap.querySelector('.carousel-prev')?.addEventListener('click', () => move(-1));
  wrap.querySelector('.carousel-next')?.addEventListener('click', () => move(1));
});

// ── Playlab filter ─────────────────────────────────────────────────────────
const filterBtns = document.querySelectorAll('.filter-btn');
if (filterBtns.length) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tag = btn.dataset.filter;
      document.querySelectorAll('.experiment').forEach(exp => {
        const match = tag === 'all' || exp.dataset.tag === tag;
        exp.classList.toggle('hidden', !match);
      });
    });
  });
}

// ── Lightbox ───────────────────────────────────────────────────────────────
const documentationImages = [...document.querySelectorAll('.carousel-track img')];
let lightbox = document.getElementById('lightbox');
if (!lightbox && documentationImages.length) {
  lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <div class="lb-header">
      <span class="lb-title"></span>
      <span class="lb-tag"></span>
      <button class="lb-close" type="button" aria-label="close">&times;</button>
    </div>
    <div class="lb-main">
      <img class="lb-main-img" src="" alt="" />
    </div>
    <div class="lb-thumbs"></div>
  `;
  document.body.appendChild(lightbox);
}

if (lightbox) {
  const lbTitle  = lightbox.querySelector('.lb-title');
  const lbTag    = lightbox.querySelector('.lb-tag');
  const lbImg    = lightbox.querySelector('.lb-main-img');
  const lbThumbs = lightbox.querySelector('.lb-thumbs');
  let imgs = [], idx = 0;

  function setImg(i) {
    idx = i;
    lbImg.src = imgs[i];
    lbThumbs.querySelectorAll('img').forEach((t, j) => t.classList.toggle('active', j === i));
  }

  function open(images, startIdx, title, tag) {
    imgs = images;
    lbTitle.textContent = title;
    lbTag.textContent   = tag || '';
    lbThumbs.innerHTML  = '';
    images.forEach((src, i) => {
      const t = document.createElement('img');
      t.src = src;
      t.addEventListener('click', () => setImg(i));
      lbThumbs.appendChild(t);
    });
    setImg(startIdx);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  lightbox.querySelector('.lb-close').addEventListener('click', close);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowRight')  setImg(Math.min(imgs.length - 1, idx + 1));
    if (e.key === 'ArrowLeft')   setImg(Math.max(0, idx - 1));
  });

  document.querySelectorAll('.experiment').forEach(exp => {
    const title  = exp.dataset.title || '';
    const tag    = exp.dataset.tag   || '';
    const images = [...exp.querySelectorAll('.exp-gallery img')].map(i => i.src);
    exp.querySelector('.exp-thumb')?.addEventListener('click', () => {
      if (images.length) open(images, 0, title, tag);
    });
  });

  const artworkGallery = document.querySelector('.playlab-page #gallery .gallery');
  if (artworkGallery) {
    const galleryImages = [...artworkGallery.querySelectorAll('img')];
    const images = galleryImages.map(image => image.currentSrc || image.src);

    galleryImages.forEach((image, imageIndex) => {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `Enlarge artwork ${imageIndex + 1}`);
      const openImage = () => open(images, imageIndex, 'artsy fartsy', 'artwork');
      image.addEventListener('click', openImage);
      image.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openImage();
      });
    });
  }

  document.querySelectorAll('.carousel-wrap').forEach(carousel => {
    const title = document.querySelector('header h1')?.textContent.trim() || '';
    const tag = carousel.querySelector('h2')?.textContent.trim() || 'documentation';
    const galleryImages = [...carousel.querySelectorAll('.carousel-track img')];
    const images = galleryImages.map(image => image.currentSrc || image.src);

    galleryImages.forEach((image, imageIndex) => {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `Enlarge documentation image ${imageIndex + 1}`);
      const openImage = () => open(images, imageIndex, title, tag);
      image.addEventListener('click', openImage);
      image.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openImage();
      });
    });
  });
}
