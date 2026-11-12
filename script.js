// ===== Настройки =====
const CONFIG = {
  phoneWa: '79262823457', // номер для WhatsApp (только цифры)
};
const waLink = (text) => `https://wa.me/${CONFIG.phoneWa}?text=${encodeURIComponent(text)}`;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ===== Мобильное меню =====
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
const setMenu = (open) => {
  nav.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
};
burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// ===== Полоса прогресса прокрутки =====
const progress = document.querySelector('.progress');
const onScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : 0);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== CSS-3D: собираем кубоиды (6 граней) =====
const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'];
function buildCuboid(el) {
  if (el.dataset.built) return;
  el.dataset.built = '1';
  FACES.forEach((f) => {
    const face = document.createElement('div');
    face.className = `face face--${f}`;
    el.appendChild(face);
  });
  if (el.dataset.label) {
    el.querySelector('.face--front').textContent = el.dataset.label;
  }
}

// кубики-шаги «Как мы работаем»
document.querySelectorAll('.step-cube').forEach((el) => {
  const n = el.textContent.trim();
  el.innerHTML = `<span class="iso-mini"><span class="cuboid cuboid--step" style="--w:56px;--h:56px;--d:56px" data-label="${n}"></span></span>`;
});

document.querySelectorAll('.cuboid').forEach(buildCuboid);

// фургоны в блоке «Погрузка»: двери, борт, крыша
const DOOR_FACE = { rear: 'right', side: 'front', top: 'top' };
document.querySelectorAll('.iso').forEach((iso) => {
  const kind = ['rear', 'side', 'top'].find((k) => iso.classList.contains(`iso--${k}`));
  const van = iso.querySelector('.cuboid--box');
  if (!van || !kind) return;
  const face = van.querySelector(`.face--${DOOR_FACE[kind]}`);
  const door = document.createElement('div');
  door.className = 'door';
  face.appendChild(door);
  face.classList.add('has-door');
  const front = van.querySelector('.face--front');
  (kind === 'side' ? door : front).classList.add('brand');
});

// ===== 3D-наклон карточек за курсором =====
if (finePointer && !reduceMotion) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    const strength = card.classList.contains('frame3d') ? 10 : 9;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * strength}deg) rotateY(${(x - 0.5) * strength * 1.2}deg) translateZ(10px)`;
      card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.transform = '';
    });
  });
}

// ===== Счётчики =====
const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window && !reduceMotion) {
  const co = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target, to = Number(el.dataset.count), t0 = performance.now(), dur = 1400;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
      co.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => co.observe(el));
}

// ===== Появление блоков при прокрутке =====
const revealTargets = document.querySelectorAll(
  '.section__head, .card3d, .about__text, .steps li, .price-intro, .badges, .contact__info, .shot'
);
if ('IntersectionObserver' in window) {
  revealTargets.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealTargets.forEach((el) => io.observe(el));
}

// ===== Автопарк: просмотр фото =====
const lb = document.getElementById('lightbox');
const shots = [...document.querySelectorAll('.shot')];
if (lb && shots.length && typeof lb.showModal === 'function') {
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  let cur = 0;
  const show = (i) => {
    cur = (i + shots.length) % shots.length;
    const img = shots[cur].querySelector('img');
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = shots[cur].querySelector('.shot__cap').textContent;
    lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
  };
  shots.forEach((s, i) => s.addEventListener('click', () => { show(i); lb.showModal(); }));
  lb.querySelector('.lightbox__prev').addEventListener('click', () => show(cur - 1));
  lb.querySelector('.lightbox__next').addEventListener('click', () => show(cur + 1));
  lb.querySelector('.lightbox__close').addEventListener('click', () => lb.close());
  // клик мимо фото и кнопок закрывает
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__fig')) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  // свайп на телефоне
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

// ===== Заявка → WhatsApp =====
const form = document.getElementById('request');
const err = document.getElementById('formError');
const phoneInput = form.elements.phone;

phoneInput.addEventListener('input', () => {
  let d = phoneInput.value.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;
  d = d.slice(0, 11);
  const p = d.slice(1);
  let out = '+7';
  if (p.length) out += ' (' + p.slice(0, 3);
  if (p.length >= 3) out += ')';
  if (p.length > 3) out += ' ' + p.slice(3, 6);
  if (p.length > 6) out += '-' + p.slice(6, 8);
  if (p.length > 8) out += '-' + p.slice(8, 10);
  phoneInput.value = out;
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.elements.name.value.trim();
  const digits = phoneInput.value.replace(/\D/g, '');
  form.elements.name.classList.toggle('is-invalid', !name);
  phoneInput.classList.toggle('is-invalid', digits.length !== 11);
  if (!name || digits.length !== 11) {
    err.textContent = 'Укажите имя и телефон, чтобы мы могли перезвонить.';
    return;
  }
  err.textContent = '';
  const lines = ['Заявка с сайта PEREVOZKA_DMD', `Имя: ${name}`, `Телефон: ${phoneInput.value}`];
  const from = form.elements.from.value.trim();
  const to = form.elements.to.value.trim();
  const cargo = form.elements.cargo.value.trim();
  if (from) lines.push(`Откуда: ${from}`);
  if (to) lines.push(`Куда: ${to}`);
  if (cargo) lines.push(`Что везём: ${cargo}`);
  window.open(waLink(lines.join('\n')), '_blank', 'noopener');
});

document.getElementById('year').textContent = new Date().getFullYear();
