/* Portafolio David Roa — interacciones
   Sin dependencias. Todo lo que se ve en las demos usa datos ficticios. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Año ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Navegación ---------- */
  const nav = $('.nav');
  const toggle = $('.nav-toggle');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 20), { passive: true });
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  const links = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('active'));
      links.get(e.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* ---------- Skeleton loaders ----------
     Sin esperas artificiales: cada bloque se prepara un poco antes de
     entrar en pantalla (400 px de anticipación). El esqueleto solo se ve
     si el contenido todavía no está listo, por ejemplo al bajar muy rápido. */
  const onReady = new Map();
  const loader = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      loader.unobserve(e.target);
      requestAnimationFrame(() => {
        e.target.classList.add('is-ready');
        onReady.get(e.target)?.();
      });
    });
  }, { rootMargin: '400px 0px 400px 0px' });
  const markReady = el => { el.classList.add('is-ready'); onReady.get(el)?.(); };
  // Lo que ya está en pantalla al abrir la página se muestra de inmediato;
  // el resto se prepara al acercarse.
  const startLoaders = () => $$('[data-load]').forEach(el => {
    el.getBoundingClientRect().top < innerHeight + 400 ? markReady(el) : loader.observe(el);
  });

  /* ---------- Revelado al hacer scroll ---------- */
  const revealEls = $$('.section-head, .case-grid, .about-card, .case-hero, .journey li, .contact, .domain');
  revealEls.forEach(el => el.classList.add('reveal'));
  const rev = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rev.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  revealEls.forEach(el => rev.observe(el));

  /* ---------- Reflejo del vidrio que sigue al puntero ---------- */
  if (matchMedia('(hover: hover)').matches) {
    // Un solo cálculo por cuadro, aunque el puntero mande muchos eventos
    $$('.glass-lg').forEach(el => {
      let raf = 0, x = 0, y = 0;
      el.addEventListener('pointermove', e => {
        x = e.clientX; y = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', `${x - r.left}px`);
          el.style.setProperty('--my', `${y - r.top}px`);
        });
      }, { passive: true });
    });
  }

  /* ---------- Conteo animado de cifras ---------- */
  const fmt = n => n.toLocaleString('es-CO');
  const countUp = root => $$('[data-count]', root).forEach(el => {
    const end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduced) return;
    const t0 = performance.now(), dur = 1100;
    const step = t => {
      const p = Math.min((t - t0) / dur, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      el.textContent = pre + fmt(v) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const heroStats = $('.hero-stats');
  onReady.set(heroStats, () => countUp(heroStats));
  startLoaders();

  /* =========================================================
     Demo: ¿pistola o persona?
     Misma idea que en LEMOND: teclas a < 60 ms y al menos 4
     caracteres = pistola. Una pausa de 120 ms cierra el código.
     ========================================================= */
  const MAX_GAP = 60, MIN_LEN = 4, IDLE = 120, GRAPH_MAX = 200;
  const graph = $('#scan-graph'), codeEl = $('#scan-code'), eanEl = $('#scan-ean');
  const verdict = $('#scan-verdict'), queue = $('#scan-queue');
  const btnSim = $('#btn-simular'), btnListen = $('#btn-escuchar');
  const GRAPH_H = 100; // px útiles de la gráfica
  graph.style.setProperty('--t', `${(MAX_GAP / GRAPH_MAX) * GRAPH_H}px`);

  let buffer = '', shown = '', last = 0, timer = null, sawHuman = false, burstStart = 0, listening = false, simulating = false;

  const setVerdict = (text, cls = '') => { verdict.textContent = text; verdict.className = 'badge ' + cls; };
  const clearGraph = () => $$('.bar', graph).forEach(b => b.remove());
  const addBar = gap => {
    const b = document.createElement('span');
    b.className = 'bar' + (gap > MAX_GAP ? ' slow' : '');
    b.style.height = `${Math.max(4, Math.min(gap, GRAPH_MAX) / GRAPH_MAX * GRAPH_H)}px`;
    b.title = `${Math.round(gap)} ms`;
    graph.appendChild(b);
    const bars = $$('.bar', graph);
    if (bars.length > 26) bars[0].remove();
  };

  const eanCheck = d12 => {
    const s = [...d12].reduce((acc, d, i) => acc + (+d) * (i % 2 ? 3 : 1), 0);
    return (10 - (s % 10)) % 10;
  };
  const describeEan = code => {
    if (!/^\d{13}$/.test(code)) return '';
    const ok = eanCheck(code.slice(0, 12)) === +code[12];
    const interno = +code.slice(0, 3) >= 200 && +code.slice(0, 3) <= 299;
    return `EAN-13 · dígito verificador ${ok ? 'válido ✓' : 'inválido ✗'}${interno ? ' · rango interno GS1 200–299' : ''}`;
  };

  function flush() {
    clearTimeout(timer);
    if (buffer.length >= MIN_LEN && !sawHuman) {
      const ms = Math.round(last - burstStart);
      const li = document.createElement('li');
      li.textContent = buffer;
      queue.prepend(li);
      if (queue.children.length > 6) queue.lastElementChild.remove();
      setVerdict(`Pistola · ${buffer.length} caracteres en ${ms} ms`, 'gun');
      eanEl.textContent = describeEan(buffer);
    } else if (buffer.length) {
      setVerdict('Persona escribiendo · se ignora', 'human');
    }
    buffer = '';
    sawHuman = false;
  }

  function handleKey(key) {
    const now = performance.now();
    const gap = last ? now - last : Infinity;
    if (gap > 700) { clearGraph(); buffer = ''; sawHuman = false; burstStart = now; shown = ''; eanEl.textContent = ''; }
    else if (gap > MAX_GAP) { sawHuman = true; buffer = ''; burstStart = now; }
    if (gap !== Infinity && gap <= 700) addBar(gap);
    last = now;

    if (key === 'Enter') return flush();
    if (key.length !== 1) return;
    buffer += key;
    shown = (shown + key).slice(-20);
    codeEl.textContent = shown;
    if (sawHuman) setVerdict(`Persona · pausa de ${Math.round(gap)} ms`, 'human');
    clearTimeout(timer);
    timer = setTimeout(flush, IDLE);
  }

  document.addEventListener('keydown', e => {
    if (!listening || simulating) return;
    if (e.target.closest('input, textarea, [contenteditable]')) return; // no contar doble
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') e.preventDefault();
    handleKey(e.key);
  });

  btnListen.addEventListener('click', () => {
    listening = !listening;
    btnListen.setAttribute('aria-pressed', listening);
    btnListen.textContent = listening ? 'Escuchando… (clic para parar)' : 'Activar escucha del teclado';
    setVerdict(listening ? 'Escribe un código con el teclado' : 'Esperando lectura', listening ? 'listening' : '');
  });

  btnSim.addEventListener('click', () => {
    if (simulating) return;
    simulating = true;
    btnSim.disabled = true;
    const d12 = '2' + String(Math.floor(Math.random() * 100)).padStart(2, '0') + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
    const code = d12 + eanCheck(d12);
    const keys = [...code, 'Enter'];
    last = 0;
    let i = 0;
    const next = () => {
      handleKey(keys[i++]);
      if (i < keys.length) setTimeout(next, 10 + Math.random() * 18);
      else { simulating = false; btnSim.disabled = false; }
    };
    next();
  });

  /* =========================================================
     Demo: cruce SAP (datos ficticios)
     ========================================================= */
  const filas = [
    ['4500900101', 'Yogur fresa 1 L', 'Nevera', 120, 120],
    ['4500900101', 'Queso campesino 500 g', 'Nevera', 80, 76],
    ['4500900102', 'Leche deslactosada 1 L', 'Nevera', 300, 300],
    ['4500900103', 'Jamón sánduche 250 g', 'Nevera', 64, null],
    ['4500900104', 'Pollo entero congelado', 'Congelados', 90, 90],
    ['4500900104', 'Nuggets de pollo 400 g', 'Congelados', 150, 150],
    ['4500900105', 'Helado vainilla 1 L', 'Congelados', 48, 54],
    ['4500900106', 'Mezcla de verduras 1 kg', 'Congelados', null, 36],
    ['4500900107', 'Banano criollo', 'Fruver', 200, 200],
    ['4500900107', 'Tomate chonto', 'Fruver', 110, 104],
    ['4500900108', 'Papa pastusa 2 kg', 'Fruver', 160, 160],
    ['4500900109', 'Aguacate hass', 'Fruver', null, 40],
  ].map(([oc, mat, q, sap, rot]) => {
    const estado = sap == null ? 'rot' : rot == null ? 'sap' : sap === rot ? 'ok' : 'dif';
    return { oc, mat, q, sap, rot, estado };
  });
  const ESTADOS = {
    ok: { label: 'Coincide', cls: 'ok' },
    dif: { label: 'Diferencia', cls: 'warn' },
    sap: { label: 'Solo en SAP', cls: 'info' },
    rot: { label: 'Solo en rótulos', cls: 'lilac' },
  };
  let cuadrante = 'todos';
  const activos = new Set(Object.keys(ESTADOS));
  const tbody = $('#tabla-cruce tbody'), estadosEl = $('#estados');
  const num = v => v == null ? '<span class="muted">—</span>' : fmt(v);

  function renderCruce() {
    const enQ = filas.filter(f => cuadrante === 'todos' || f.q === cuadrante);
    estadosEl.innerHTML = Object.entries(ESTADOS).map(([k, e]) => {
      const n = enQ.filter(f => f.estado === k).length;
      return `<button class="pill ${e.cls}" data-e="${k}" aria-pressed="${activos.has(k)}">${e.label} <b>${n}</b></button>`;
    }).join('');
    const vis = enQ.filter(f => activos.has(f.estado));
    const tSap = vis.reduce((a, f) => a + (f.sap || 0), 0), tRot = vis.reduce((a, f) => a + (f.rot || 0), 0);
    tbody.innerHTML = vis.length ? vis.map((f, i) => `
      <tr style="animation-delay:${i * 30}ms">
        <td><code>${f.oc}</code></td><td>${f.mat}</td><td>${f.q}</td>
        <td class="r">${num(f.sap)}</td><td class="r">${num(f.rot)}</td>
        <td><span class="pill ${ESTADOS[f.estado].cls}">${ESTADOS[f.estado].label}</span></td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted">Sin líneas con este filtro.</td></tr>';
    let tfoot = $('#tabla-cruce tfoot');
    if (!tfoot) { tfoot = document.createElement('tfoot'); $('#tabla-cruce').appendChild(tfoot); }
    tfoot.innerHTML = `<tr><td>Total</td><td>${vis.length} líneas</td><td></td><td class="r">${fmt(tSap)}</td><td class="r">${fmt(tRot)}</td><td>${tSap === tRot ? '<span class="pill ok">Cuadra</span>' : `<span class="pill warn">Δ ${fmt(tRot - tSap)}</span>`}</td></tr>`;
  }
  $('#cuadrantes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    cuadrante = b.dataset.q;
    $$('#cuadrantes button').forEach(x => x.setAttribute('aria-selected', x === b));
    renderCruce();
  });
  estadosEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.e;
    activos.has(k) ? activos.delete(k) : activos.add(k);
    if (!activos.size) Object.keys(ESTADOS).forEach(x => activos.add(x));
    renderCruce();
  });
  renderCruce();


  /* =========================================================
     Demo Picking: cola de lecturas sin conexión (idempotente)
     ========================================================= */
  const offDevice = $('#off-device');
  if (offDevice) {
    const TOTAL = 8;
    const netBtn = $('#net-toggle'), netLabel = $('#net-label'), arrow = $('#off-arrow');
    const countEl = $('#off-count'), barEl = $('#off-bar'), logEl = $('#off-log');
    let online = true, cola = [], recibidas = new Set(), ultimo = null, sending = false, seq = 0;
    const newId = () => 'L-' + Date.now().toString(36).slice(-4) + '-' + (++seq).toString().padStart(3, '0');

    const render = () => {
      offDevice.innerHTML = cola.length
        ? cola.map(l => `<li><code>${l.id}</code><span class="pill ${l.estado === 'enviada' ? 'ok' : 'warn'}">${l.estado === 'enviada' ? 'Enviada' : 'En cola'}</span></li>`).join('')
        : '<li class="empty">Sin lecturas pendientes</li>';
      countEl.textContent = recibidas.size;
      barEl.style.setProperty('--p', `${recibidas.size / TOTAL * 100}%`);
      $('#off-scan').disabled = recibidas.size + cola.filter(l => l.estado !== 'enviada').length >= TOTAL;
      $('#off-dup').disabled = !ultimo || !recibidas.has(ultimo);
    };
    const log = (t, cls = '') => { logEl.textContent = t; logEl.className = cls || 'muted'; };

    const servidor = id => {
      if (recibidas.has(id)) return false; // mismo id: no se cuenta doble
      recibidas.add(id); return true;
    };
    const enviar = () => {
      if (sending || !online) return;
      const l = cola.find(x => x.estado === 'cola');
      if (!l) { // limpiar enviadas después de un momento
        setTimeout(() => { cola = cola.filter(x => x.estado !== 'enviada'); render(); }, 900);
        return;
      }
      sending = true;
      setTimeout(() => {
        sending = false;
        if (!online) return render();
        servidor(l.id); l.estado = 'enviada';
        log(`Recibida ${l.id} · caja ${recibidas.size} de ${TOTAL}`);
        if (recibidas.size === TOTAL) log('Producto completo · 8 de 8 cajas ✓');
        render(); enviar();
      }, reduced ? 0 : 380);
    };

    $('#off-scan').addEventListener('click', () => {
      const l = { id: newId(), estado: 'cola' };
      cola.push(l); ultimo = l.id;
      if (!online) log(`Sin conexión: ${cola.filter(x => x.estado === 'cola').length} lectura(s) guardadas en el equipo`);
      render(); enviar();
    });
    $('#off-dup').addEventListener('click', () => {
      if (!online) return log('Sin conexión: el reintento espera en la cola');
      const ok = servidor(ultimo);
      log(ok ? `Recibida ${ultimo}` : `Reintento de ${ultimo} ignorado: ese id ya se contó`, ok ? '' : 'dup');
      render();
    });
    $('#off-reset').addEventListener('click', () => { cola = []; recibidas.clear(); ultimo = null; log('Sin lecturas todavía'); render(); });
    netBtn.addEventListener('click', () => {
      online = !online;
      netBtn.setAttribute('aria-pressed', online);
      netLabel.textContent = online ? 'En línea' : 'Sin conexión';
      arrow.classList.toggle('cut', !online);
      if (online) { const n = cola.filter(x => x.estado === 'cola').length; log(n ? `Conexión recuperada: enviando ${n} lectura(s)…` : 'En línea'); enviar(); }
      else log('Sin conexión: las lecturas se guardan en el equipo');
      render();
    });
    render();
  }

  /* ---------- Orden de rutas: texto vs ruta_num() ---------- */
  const sortText = $('#sort-text'), sortNat = $('#sort-nat');
  if (sortText && sortNat) {
    const rutas = ['RUTA 10', 'RUTA 2', 'RUTA 1', 'RUTA 0', 'RUTA 3'];
    const ruta_num = r => parseInt(r.replace(/\D+/g, ''), 10);
    const li = arr => arr.map(r => `<li>${r}</li>`).join('');
    sortText.innerHTML = li([...rutas].sort());
    sortNat.innerHTML = li([...rutas].sort((a, b) => ruta_num(a) - ruta_num(b)));
  }

  /* ---------- QR ilustrativo del rótulo (no codifica datos) ---------- */
  const qr = $('#qr-mock');
  if (qr) {
    const N = 21;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const finder = (x, y) => {
      for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
        const dx = x - fx, dy = y - fy;
        if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
          const edge = dx === 0 || dx === 6 || dy === 0 || dy === 6;
          const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          return edge || core ? 1 : 0;
        }
        if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) return 0;
      }
      return null;
    };
    let html = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const f = finder(x, y);
      const on = f === null ? rnd() > 0.52 : f === 1;
      html += `<i${on ? '' : ' class="o"'}></i>`;
    }
    qr.innerHTML = html;
  }
})();
