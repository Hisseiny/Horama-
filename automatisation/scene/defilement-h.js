// The scroll of the page by H, shown as a hand scrolls (installLayer of scene.mjs puts this in the page itself, the
// main world, at each new document). The bridge of H (hai_drivers, Selenium) scrolls the page with a script:
// `window.scrollBy(dx, dy)` (command scroll_page), after it has put its helper `hjs_0x2a` in the page. That call alone
// is replaced by the same scroll, the same distance, eased and lasting with the distance: 700 ms per height of screen,
// 350 ms at least, 1.1 s at most, because H looks at the page again 1.49 s after its scroll at the soonest (bridge log
// of 18/11). A call of the site itself (its code is in the stack, with its address) and every other call go through
// unchanged.
(() => {
  // The window carries these two functions itself (not its prototype).
  const scrollBy = window.scrollBy;
  const scrollTo = window.scrollTo;
  const fromBridge = () => Object.prototype.hasOwnProperty.call(window, "hjs_0x2a") && !/(https?|file):\/\//.test(new Error().stack?.split("\n").slice(2).join("\n") ?? "");
  let run = 0;
  window.scrollBy = function (...args) {
    if (this !== window || !fromBridge()) return scrollBy.apply(this, args);
    const [dx, dy] = typeof args[0] === "object" && args[0] ? [Number(args[0].left) || 0, Number(args[0].top) || 0] : [Number(args[0]) || 0, Number(args[1]) || 0];
    const page = document.scrollingElement ?? document.documentElement;
    const from = scrollY;
    const to = Math.max(0, Math.min(from + dy, page.scrollHeight - innerHeight));
    if (dx || Math.abs(to - from) < 2) return scrollBy.apply(this, args);
    const ms = Math.max(350, Math.min(1100, (700 * Math.abs(to - from)) / innerHeight));
    const started = performance.now();
    const mine = ++run;
    const step = (now) => {
      if (mine !== run) return;
      const t = Math.min(1, (now - started) / ms);
      const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      scrollTo.call(window, { left: scrollX, top: from + (to - from) * e, behavior: "instant" });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
})();
