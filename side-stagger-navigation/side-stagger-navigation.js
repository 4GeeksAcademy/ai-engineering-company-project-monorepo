const NUM_LINES = 30;
const navItems = [
  { position: 1, title: 'Inicio', target: '#hero' },
  { position: 15, title: 'Estadisticas', target: '#estadisticas' },
  { position: 26, title: 'Proceso', target: '#timeline' },
  { position: 29, title: 'Contacto', target: '#contacto' },
];

const sideNav = document.getElementById('side-stagger-navigation');
const lineStack = document.getElementById('side-line-stack');
const siteHeader = document.getElementById('site-header');
const navLinks = [];
const allBars = [];

let mouseY = Number.POSITIVE_INFINITY;
let isHovered = false;
let activeTarget = '#hero';
let rafId = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mapDistanceToWidth(distance) {
  const maxDistance = 120;
  const normalized = clamp(1 - Math.abs(distance) / maxDistance, 0, 1);
  return 18 + normalized * 90;
}

function updateLineWidths() {
  allBars.forEach(({ bar, element, isLink, target }) => {
    const bounds = element.getBoundingClientRect();
    const centerY = bounds.top + bounds.height / 2;
    const distance = mouseY - centerY;

    if (isLink) {
      const isActive = target === activeTarget;
      const width = isHovered ? 150 : isActive ? 90 : 28;
      bar.style.width = `${width}px`;
    } else {
      const width = isHovered ? mapDistanceToWidth(distance) : 18;
      bar.style.width = `${Math.round(width)}px`;
    }
  });

  rafId = null;
}

function requestLineUpdate() {
  if (rafId !== null) {
    return;
  }
  rafId = window.requestAnimationFrame(updateLineWidths);
}

function setActiveLink(target) {
  activeTarget = target;
  navLinks.forEach((link) => {
    const isActive = link.dataset.target === target;
    link.classList.toggle('nav-line--active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
  requestLineUpdate();
}

function syncHeaderHeight() {
  if (!siteHeader) {
    return;
  }

  const headerHeight = Math.round(siteHeader.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--site-header-height', `${headerHeight}px`);
}

function isNearPageEnd() {
  const threshold = 8;
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
}

function syncActiveLinkAtPageEnd() {
  if (isNearPageEnd()) {
    setActiveLink('#contacto');
  }
}

function scrollToSidebarPercentage(clientY) {
  if (!sideNav) {
    return;
  }

  const rect = sideNav.getBoundingClientRect();
  const relativeY = clamp(clientY - rect.top, 0, rect.height);
  const ratio = rect.height === 0 ? 0 : relativeY / rect.height;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetScroll = ratio * maxScroll;

  window.scrollTo({
    top: targetScroll,
    behavior: 'smooth',
  });
}

if (sideNav && lineStack) {
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  for (let i = 1; i <= NUM_LINES; i += 1) {
    const item = navItems.find((navItem) => navItem.position === i);

    if (item) {
      const link = document.createElement('a');
      link.className = 'nav-line nav-line--link';
      link.href = item.target;
      link.dataset.target = item.target;
      link.setAttribute('aria-label', `Ir a la seccion ${item.title}`);

      const label = document.createElement('span');
      label.className = 'line-label';
      label.textContent = item.title;

      const bar = document.createElement('span');
      bar.className = 'line-bar';

      link.appendChild(label);
      link.appendChild(bar);
      lineStack.appendChild(link);

      navLinks.push(link);
      allBars.push({ bar, element: link, isLink: true, target: item.target });
    } else {
      const line = document.createElement('div');
      line.className = 'nav-line';

      const bar = document.createElement('span');
      bar.className = 'line-bar';

      line.appendChild(bar);
      lineStack.appendChild(line);

      allBars.push({ bar, element: line, isLink: false, target: null });
    }
  }

  sideNav.addEventListener('mousemove', (event) => {
    mouseY = event.clientY;
    isHovered = true;
    sideNav.classList.add('is-hovered');
    requestLineUpdate();
  });

  sideNav.addEventListener('mouseleave', () => {
    mouseY = Number.POSITIVE_INFINITY;
    isHovered = false;
    sideNav.classList.remove('is-hovered');
    requestLineUpdate();
  });

  sideNav.addEventListener('click', (event) => {
    if (event.button !== 0) {
      return;
    }

    const targetElement = event.target;
    const clickedLink = targetElement instanceof HTMLElement ? targetElement.closest('a.nav-line--link') : null;

    if (clickedLink instanceof HTMLAnchorElement) {
      const target = clickedLink.getAttribute('href');
      if (target) {
        setActiveLink(target);
      }
      return;
    }

    scrollToSidebarPercentage(event.clientY);
  });

  const sections = navItems
    .map((item) => document.querySelector(item.target))
    .filter(Boolean);

  const sectionRatios = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      if (isNearPageEnd()) {
        setActiveLink('#contacto');
        return;
      }

      entries.forEach((entry) => {
        sectionRatios.set(`#${entry.target.id}`, entry.intersectionRatio);
      });

      let candidate = activeTarget;
      let maxRatio = 0;

      sections.forEach((section) => {
        const target = `#${section.id}`;
        const ratio = sectionRatios.get(target) || 0;
        if (ratio > maxRatio) {
          maxRatio = ratio;
          candidate = target;
        }
      });

      if (candidate !== activeTarget) {
        setActiveLink(candidate);
      }
    },
    {
      root: null,
      rootMargin: '-18% 0px -20% 0px',
      threshold: [0, 0.05, 0.2, 0.4, 0.6, 0.8, 1],
    }
  );

  sections.forEach((section) => observer.observe(section));
  window.addEventListener('scroll', syncActiveLinkAtPageEnd, { passive: true });

  setActiveLink('#hero');
  syncActiveLinkAtPageEnd();
  requestLineUpdate();
}
