/* ============================================================
   crushura® Parts — 渐进增强脚本

   **这一份不是定版稿的 app.js。** 那一层（data.js + hash 路由 + 用 innerHTML
   注入页头页脚）一条都不在产物里：内容和链接全部由构建函数渲染成 HTML，
   用户故事 46 要的就是「爬虫不用执行 JS 就能索引全部内容」。

   这里只做五件事，**每一件都是「没有它页面照样读得到、链接照样点得动」**：

   1. 页头滚动变色（.scrolled）—— 不做的话，首页往下滚过深色首屏之后
      透明页头会在白底上显示白字
   2. 移动端抽屉开合 —— 不做的话手机上点不开菜单（页脚仍有全部入口）
   3. 回到顶部
   4. 表单前端校验 —— 不做的话表单照样提交，只是要等服务端往返才知道填错了
   5. 首页 hero 的 banner 轮播 —— 不做的话第一张照样亮着（`.is-active` 是模板
      直接渲染上去的），只是不切图

   入场动效（.reveal）也是在这里加的：CSS 里 .reveal{opacity:0} 只对带这个类的
   元素生效，而类由这里加——**所以 JS 没跑起来时内容是直接可见的，不会白屏**。
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── 页头滚动变色 + 回到顶部 ─────────────────────────── */
  function initScrollChrome() {
    var header = $("#site-header"), top = $("#to-top");
    function onScroll() {
      if (header) header.classList.toggle("scrolled", window.scrollY > 40);
      if (top) top.hidden = window.scrollY < 600;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (top) top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ── 移动端抽屉 ─────────────────────────────────────── */
  function initDrawer() {
    var drawer = $("#drawer"), scrim = $("#drawer-scrim"), openBtn = $("#nav-toggle"), closeBtn = $("#drawer-close");
    if (!drawer || !scrim || !openBtn) return;

    function open() {
      scrim.classList.add("show");
      drawer.classList.add("open");
      openBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      drawer.classList.remove("open");
      scrim.classList.remove("show");
      openBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      openBtn.focus();
    }
    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) close();
    });
    $$("a", drawer).forEach(function (a) { a.addEventListener("click", close); });

    /* 抽屉里那个 Products 手风琴。变量名别叫 open——上面那个 open() 是抽屉的开合，
       同名会把函数遮掉，而这类遮蔽在跨行阅读时看不出来。 */
    var acc = $(".acc-btn", drawer), panel = $(".acc-panel", drawer);
    if (acc && panel) acc.addEventListener("click", function () {
      var expanded = panel.classList.toggle("open");
      acc.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }

  /* ── 入场动效 ───────────────────────────────────────── */
  var io = null;
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    var els = $$(".sec-head, .stat, .line-row, .rail-card, .cat-tile, .machine-row, .part-card, .pd-top, .pd-table-wrap, .brick, .case-card, .news-row, .about-copy, .tl-item, .cta-in, .hero-copy, .hero-fig, form.panel, .info-rows, .featured");
    els.forEach(function (el) { el.classList.add("reveal"); });
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── 询盘表单的前端校验 ─────────────────────────────── */
  /* 只是省一次往返：校验规则和错误文案都写在模板里，服务端仍然要自己验一遍
     （关掉 JS 的浏览器不跑这一段，而机器人也不跑）。 */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function initForms() {
    var form = $("#contact-form");
    if (!form) return;
    var rules = [
      ["#f-name", function (v) { return v.trim().length > 0; }],
      ["#f-email", function (v) { return EMAIL_RE.test(v.trim()); }],
      ["#f-msg", function (v) { return v.trim().length > 0; }]
    ];
    form.addEventListener("submit", function (e) {
      var pass = true;
      rules.forEach(function (rule) {
        var input = $(rule[0]);
        if (!input) return;
        var field = input.closest(".field");
        var valid = rule[1](input.value);
        if (field) {
          field.classList.toggle("bad", !valid);
          var err = $(".err", field);
          if (err) err.hidden = valid;
        }
        pass = valid && pass;
      });
      if (!pass) { e.preventDefault(); return; }
      /* 通了就让浏览器正常提交——**不 preventDefault**。
         定版稿在这里是拦住并显示一句本地假成功，产品里那是谎话。
         这里**不显示任何成功态**：提交是一次真的页面跳转，成功与否由平台
         那一页说（见 `contact.html` 顶部第 ③ 条）。在这里先亮一句「已发送」
         是在还不知道服务端收了没有的时候替它回答。 */
    });
  }

  /* ── 首页 hero 的 banner 轮播 ───────────────────────── */
  var ROTATE_MS = 6000;
  function initHeroRotate() {
    var slides = $$(".hero-bg");
    // 只有一张就什么都不做；开了「减少动效」也不切（那是使用者的明确偏好）
    if (slides.length < 2) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var hero = $("#home"), i = 0, timer = null;
    function show(n) {
      slides[i].classList.remove("is-active");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("is-active");
    }
    function start() {
      if (!timer) timer = window.setInterval(function () { show(i + 1); }, ROTATE_MS);
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }
    start();
    // 标签页切到后台就停：没人看，白跑一遍还费电
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    // 鼠标停在首屏上不切——他正在看那一张
    if (hero) {
      hero.addEventListener("mouseenter", stop);
      hero.addEventListener("mouseleave", start);
    }
  }

  initScrollChrome();
  initDrawer();
  initReveal();
  initForms();
  initHeroRotate();
})();