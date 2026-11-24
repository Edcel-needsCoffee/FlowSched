/* The original hero stays intact. The video's section sequence starts below it. */
(() => {
  const page = document.querySelector('.page');
  const dashboard = document.querySelector('.dash');
  if (!page || !dashboard) return;
  const motion = matchMedia('(prefers-reduced-motion:reduce)');
  const intro = document.createElement('div');
  intro.className = 'intro-viewport';
  page.before(intro);
  intro.append(page);
  const waves = document.querySelector('.fx');
  if (waves) intro.prepend(waves);

  const icons = {
    chart: '<path d="M6 26V16m9 10V8m9 18V13"/>',
    grid: '<rect x="5" y="6" width="22" height="22" rx="4"/><path d="M5 13h22M12 13v15m8-15v15M10 3v6m12-6v6"/>',
    download: '<path d="M16 4v17m-7-7 7 7 7-7M5 23v5h22v-5"/>',
    flow: '<circle cx="7" cy="23" r="3"/><circle cx="25" cy="9" r="3"/><path d="M7 20V9h15M25 12v11H10"/>',
    spark: '<path d="m17 3 3 9 9 3-9 3-3 10-3-10-10-3 10-3z"/>',
  };
  const icon = name => `<span class="ref-icon"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg></span>`;
  const motes = (count, prefix) => Array.from({ length: count }, (_, i) => `<i style="--x:${15 + (i * 29) % 75}%;--y:${20 + (i * 17) % 75}%;--d:${i * -.17}s" class="${prefix}"></i>`).join('');
  const below = document.createElement('main');
  below.id = 'what-it-does';
  below.className = 'reference-below';
  below.innerHTML = `
    <div class="ref-dust" aria-hidden="true"></div>
    <div class="ref-content">
      <div class="ref-strip" aria-label="FlowSched capabilities"><span>▦ &nbsp;Scheduling</span><span>◉ &nbsp;Faculty</span><span>⌘ &nbsp;Workloads</span><span>⇄ &nbsp;Rooms</span><span>◇ &nbsp;Exports</span></div>
      <section class="ref-problem ref-reveal" aria-labelledby="ref-problem-title">
        <div class="ref-problem-copy"><h2 id="ref-problem-title">Conflicts arise<br>every day.</h2><p>Rooms overlap. Workloads change.<br>With the right approach, chaos doesn't have to.</p></div>
        <div class="ref-hanging" aria-hidden="true"><span style="--x:15%;--y:24%;--tilt:-9deg;--delay:0s">Faculty available</span><span style="--x:56%;--y:36%;--tilt:10deg;--delay:-2s">A balanced week</span><span class="ref-tag-bright" style="--x:13%;--y:52%;--tilt:7deg;--delay:-1s">All classes plotted</span><span style="--x:60%;--y:68%;--tilt:-8deg;--delay:-3s">No room overlaps</span><span style="--x:12%;--y:82%;--tilt:-5deg;--delay:-4s">Conflicts resolved</span></div>
      </section>
      <section class="ref-platform ref-section" aria-labelledby="ref-platform-title">
        <div class="ref-section-heading ref-reveal"><h2 id="ref-platform-title">One connected scheduling platform</h2><p>From the first assignment to the final class program, <br>bring every part of your department's schedule together.</p></div>
        <div class="ref-platform-art ref-reveal">
          <svg class="ref-connections" viewBox="0 0 900 320" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ref-wire"><stop stop-color="#153b2a"/><stop offset="1" stop-color="#8df0b9"/></linearGradient></defs><path d="M160 90H345Q375 90 375 120V145Q375 160 400 160H640M340 90H420Q445 90 445 115V145Q445 160 465 160H640M160 250H345Q375 250 375 220V180Q375 160 400 160M340 250H420Q445 250 445 220V180Q445 160 465 160"/></svg>
          <div class="ref-node-grid"><article><h3>Scheduling</h3><p>Plot classes from start to finish.</p></article><article><h3>Faculty</h3><p>Bring the right instructors together.</p></article><article><h3>Workloads</h3><p>Keep every teaching hour in view.</p></article><article><h3>Class programs</h3><p>Keep section schedules ready to share.</p></article></div>
          <div class="ref-chip-scene" aria-hidden="true"><div class="ref-chip-rays"></div><div class="ref-processor"><span>F</span><i></i></div>${Array.from({ length: 12 }, (_, i) => `<b class="ref-circuit" style="--a:${i * 30}deg;--d:${i % 4 * -.8}s"></b>`).join('')}</div>
        </div>
      </section>
      <section class="ref-capabilities ref-section" aria-labelledby="ref-capabilities-title">
        <div class="ref-section-heading ref-reveal"><h2 id="ref-capabilities-title">All-in-one platform<br>capabilities</h2></div>
        <div class="ref-bento">
          <article class="ref-overview ref-reveal"><h3>Your department, <br>simplified in <br>one dashboard.</h3><p>See your classes, workloads, and conflicts with a clear overview of the entire term.</p><div class="ref-particle-swoop" aria-hidden="true">${motes(30, 'ref-mote')}</div></article>
          <div class="ref-dashboard-tile ref-reveal" aria-label="FlowSched dashboard preview"><div class="ref-dashboard-angle"></div></div>
          <article class="ref-resolution ref-reveal"><div class="ref-resolution-copy"><h3>Catch conflicts.<br>Keep moving.</h3></div><div class="ref-activity" aria-label="Example scheduling activity"><div><span class="ref-avatar">AR</span><b>Faculty assignment</b><small>Section schedule updated</small></div><div><span class="ref-status">Reviewing</span><b>Room overlap detected</b><small>Monday · 9:00–10:00</small></div><div><span class="ref-avatar">MS</span><b>Teaching load</b><small>Weekly hours balanced</small></div><div><span class="ref-status ref-status-ok">Resolved</span><b>A clear schedule</b><small>Ready for the next class</small></div></div></article>
          <article class="ref-export ref-reveal"><h3>From a clear plan<br>to a printed page.</h3><p>Export section schedules and faculty class programs with the details that matter.</p><a href="#ref-foundation" class="ref-discover">Discover <span>↗</span></a></article>
        </div>
      </section>
      <section id="ref-foundation" class="ref-foundation ref-section" aria-labelledby="ref-foundation-title">
        <div class="ref-section-heading ref-reveal"><h2 id="ref-foundation-title">Built on a solid foundation</h2></div>
        <div class="ref-foundation-cards">${[
          ['chart', 'Insights', 'See the bigger picture with faculty hours and workload summaries.'],
          ['grid', 'Class schedules', 'Keep subjects, sections, and rooms together in one weekly view.'],
          ['download', 'Exports', 'Take your section schedules and faculty programs into Excel.'],
          ['flow', 'Workflows', 'Move from teaching assignments to a fully plotted schedule.'],
          ['spark', 'Conflict checks', 'Spot room and faculty overlaps as you plan the term.'],
        ].map(([name, title, text], i) => `<article class="ref-foundation-card ref-reveal" style="--card:${i};--angle:${[6, -6, -5, 3, 7][i]}deg">${icon(name)}<h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
      </section>
      <section class="ref-final ref-reveal" aria-labelledby="ref-final-title"><div class="ref-beam" aria-hidden="true"></div><div class="ref-final-dust" aria-hidden="true">${motes(30, 'ref-mote')}</div><p class="ref-final-brand">FlowSched</p><h2 id="ref-final-title">Bring clarity to your next term.</h2><p>Ready for a better way to plan your department's schedule? <br>Start with one connected workspace.</p><button type="button" class="ref-final-login">Log in to FlowSched <span>↗</span></button></section>
      <footer class="ref-footer"><a href="#what-it-does">Features</a><a href="#ref-capabilities-title">Scheduling</a><a href="#ref-foundation">Workflows</a><button type="button" class="ref-back">Back to top ↑</button><span>Palompon Institute of Technology</span></footer>
    </div>`;
  intro.after(below);
  const demo = dashboard.cloneNode(true);
  demo.inert = true;
  demo.setAttribute('aria-hidden', 'true');
  below.querySelector('.ref-dashboard-angle').append(demo);
  function goTo(element) { element.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' }); }
  const button = document.getElementById('replay');
  if (button) {
    button.onclick = () => goTo(below);
    button.setAttribute('aria-controls', 'what-it-does');
  }
  below.querySelector('.ref-back').onclick = () => window.scrollTo({ top: 0, behavior: motion.matches ? 'instant' : 'smooth' });
  below.querySelector('.ref-final-login').onclick = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    parent.postMessage({ type: 'flowsched-login' }, parent.location.origin);
  };
  below.querySelectorAll('a[href^="#"]').forEach(link => link.onclick = event => {
    event.preventDefault();
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) goTo(target);
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    entry.target.classList.toggle('is-in-view', entry.isIntersecting);
  }), { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
  below.querySelectorAll('.ref-reveal').forEach(element => observer.observe(element));
  let frame = 0;
  function update() {
    frame = 0;
    const rect = below.querySelector('.ref-foundation-cards').getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
    below.style.setProperty('--fan', motion.matches ? '0' : String(Math.max(0, (progress - .4) * 2)));
    const opacity = Math.max(0, 1 - scrollY / intro.offsetHeight);
    document.querySelectorAll('#snow,#card-snow').forEach(canvas => { canvas.style.opacity = String(opacity); });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function measureBeam() {
    const login = below.querySelector('.ref-final-login');
    below.querySelector('.ref-final').style.setProperty('--beam-top', `${login.offsetTop - 55}px`);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { measureBeam(); schedule(); });
  motion.addEventListener('change', schedule);
  document.fonts.ready.then(measureBeam);
  measureBeam();
  update();
})();
