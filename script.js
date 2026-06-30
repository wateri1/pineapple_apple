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
  const backdrop = document.querySelector(".hero-backdrop");
  const fruit = document.querySelector(".whole-fruit");

  const moveScene = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const limit = Math.min(scrollTop, 460);
    const backdropShift = limit * 0.035;
    const fruitShift = limit * 0.055;

    if (backdrop) {
      backdrop.style.transform = `scale(1.02) translateY(${backdropShift}px)`;
    }

    if (fruit) {
      fruit.style.setProperty("--fruit-shift", `${fruitShift}px`);
    }
  };

  moveScene();
  window.addEventListener("scroll", moveScene, { passive: true });

  // Плавное появление блоков при прокрутке
  const revealTargets = document.querySelectorAll(
    ".reveal, .serving-card, .intro-grid article"
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
