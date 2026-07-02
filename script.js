// Смена фото в «Портрете вкуса» при наведении на карточки вкуса
const sliceLayers = document.querySelectorAll(".slice-layer");
const noteCards = document.querySelectorAll(".note-card[data-note]");

if (sliceLayers.length && noteCards.length) {
  const showNote = (index) => {
    sliceLayers.forEach((layer) => {
      layer.classList.toggle("is-active", Number(layer.dataset.note) === index);
    });
  };

  noteCards.forEach((card) => {
    const index = Number(card.dataset.note);
    card.addEventListener("mouseenter", () => showNote(index));
    card.addEventListener("focusin", () => showNote(index));
  });
}

// Витрина «Превращения»: наведение на название меняет активный рецепт
const showcaseFeature = document.querySelector(".showcase-feature");
const showcaseTabs = document.querySelectorAll(".showcase-tab");

if (showcaseFeature && showcaseTabs.length) {
  const showcaseImg = showcaseFeature.querySelector(".showcase-img");
  const showcaseTag = showcaseFeature.querySelector(".showcase-tag");
  const showcaseName = showcaseFeature.querySelector(".showcase-name");
  const showcaseDesc = showcaseFeature.querySelector(".showcase-desc");
  const showcaseMeta = showcaseFeature.querySelector(".showcase-meta");

  const products = {
    pie: {
      img: "assets/pie.png",
      alt: "Ананасово-яблочный пирог на блюде и отрезанный кусок на тарелке",
      tag: "Десерт дня",
      name: "Tarte&nbsp;Solar",
      desc:
        "Слоёное тесто, карамелизованные дольки и тёплая корица. Запекается " +
        "до золотой корки, а ананасовая кислота не даёт начинке стать приторной.",
      meta: ["Слоёное тесто", "Карамель", "Корица", "45 минут"],
    },
    smoothie: {
      img: "assets/smoozie.png",
      alt: "Высокий стакан смузи из ананасового яблока с трубочкой и зонтиком",
      tag: "Напиток",
      name: "Piña&nbsp;Frío",
      desc:
        "Холодный смузи: плотная мякоть, колотый лёд и капля кокосовых сливок. " +
        "Освежает и держит тропическую кислинку до последнего глотка.",
      meta: ["Мякоть", "Колотый лёд", "Кокос", "5 минут"],
    },
    icecream: {
      img: "assets/icecream.png",
      alt: "Упаковка фруктового льда Papple со вкусом ананаса и яблока",
      tag: "Мороженое",
      name: "Papple!",
      desc:
        "Натуральный фруктовый лёд на палочке. Чистый сок без лишнего сахара — " +
        "самый честный способ съесть этот плод жарким летом.",
      meta: ["Чистый сок", "Без сахара", "На палочке", "Лето"],
    },
  };

  let activeKey = "pie";
  let fadeTimer;

  const setProduct = (key) => {
    if (key === activeKey || !products[key]) return;
    activeKey = key;

    showcaseTabs.forEach((tab) => {
      const isActive = tab.dataset.key === key;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const product = products[key];
    showcaseFeature.classList.add("is-fading");
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => {
      showcaseImg.src = product.img;
      showcaseImg.alt = product.alt;
      showcaseTag.textContent = product.tag;
      showcaseName.innerHTML = product.name;
      showcaseDesc.textContent = product.desc;
      showcaseMeta.innerHTML = product.meta
        .map((item) => `<li>${item}</li>`)
        .join("");
      showcaseFeature.classList.remove("is-fading");
    }, 220);
  };

  showcaseTabs.forEach((tab) => {
    const { key } = tab.dataset;
    tab.addEventListener("mouseenter", () => setProduct(key));
    tab.addEventListener("focus", () => setProduct(key));
    tab.addEventListener("click", () => setProduct(key));
  });
}

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (!prefersReducedMotion) {
  const fruit = document.querySelector(".fruit-stage");

  const moveScene = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const limit = Math.min(scrollTop, 460);
    const fruitShift = limit * 0.05;

    if (fruit) {
      fruit.style.setProperty("--fruit-shift", `${fruitShift}px`);
    }
  };

  // Троттлим скролл через rAF: обновляем сцену не чаще одного кадра.
  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      moveScene();
      scrollTicking = false;
    });
  };

  moveScene();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Плавное появление блоков при прокрутке
  const revealTargets = document.querySelectorAll(
    ".reveal, .section-heading, .serving-card, .intro-grid article"
  );

  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window && revealTargets.length) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            const delay = (index % 3) * 90;
            entry.target.style.transitionDelay = `${delay}ms`;
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }
}

// Подсветка текущего раздела в навигации (scrollspy)
const navLinks = Array.from(document.querySelectorAll(".nav-links a[href^='#']"));

if (navLinks.length && "IntersectionObserver" in window) {
  const linkFor = new Map();
  const sections = [];

  navLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (section) {
      linkFor.set(section, link);
      sections.push(section);
    }
  });

  const setCurrent = (section) => {
    navLinks.forEach((link) => {
      const isCurrent = link === linkFor.get(section);
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const spy = new IntersectionObserver(
    (entries) => {
      // Берём самый верхний из пересекающихся разделов.
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length) {
        setCurrent(visible[0].target);
      } else if (
        sections.length &&
        sections[0].getBoundingClientRect().top > window.innerHeight * 0.5
      ) {
        // Выше первого раздела (герой) — снимаем подсветку.
        navLinks.forEach((link) => {
          link.classList.remove("is-current");
          link.removeAttribute("aria-current");
        });
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach((section) => spy.observe(section));
}
