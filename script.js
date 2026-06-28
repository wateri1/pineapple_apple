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
}
