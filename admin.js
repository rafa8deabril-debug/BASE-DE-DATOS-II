/* =====================================================================
   admin.js · Panel de administración de evidencias
   GitHub como "base de datos": cada alta/baja es un commit en el repo.

   USO: agregar en index.html, justo después de crud.js:
        <script src="admin.js"></script>

   SEGURIDAD:
   - NUNCA escribas el token en este archivo ni lo subas al repositorio.
   - El token se pide al conectar y se guarda solo en sessionStorage
     (se borra al cerrar la pestaña).
   - Usa un token "fine-grained" limitado a ESTE repositorio con el permiso
     Contents: Read and write, y con vencimiento corto.
===================================================================== */
(() => {
  'use strict';

  /* ---------------------------- CONFIGURACIÓN ---------------------------- */
  const CONFIG = {
    owner: 'rafa8deabril-debug',
    repo: 'BASE-DE-DATOS-II',
    branch: null,                          // null = detecta la rama por defecto
    jsonPath: 'datos/evidencias.json',
    // Sigue tu convención: "Semana 2/infografias/actividad-03/archivo.png"
    carpetaBase: (semana, actividad, tipo) => {
      const num = (String(actividad).match(/\d+/) || ['0'])[0].padStart(2, '0');
      const sub = tipo === 'Infografía' ? 'infografias' : 'documentos';
      return `${semana}/${sub}/actividad-${num}`;
    },
    semanas: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    actividades: ['Actividad 1', 'Actividad 2', 'Actividad 3', 'Actividad 4', 'Actividad 5', 'Actividad 6'],
    tipos: ['Infografía', 'Documento PDF'],
    // Archivos bajo estas rutas NO se borran del repo (index.html los usa directo).
    protegidos: ['Semana 1/'],
    // Claves de tu evidencias.json
    campos: {
      id: 'id',
      semana: 'semana',
      actividad: 'actividad',
      titulo: 'titulo',
      tipo: 'tipo',
      archivo: 'archivo',
    },
    maxMB: 25,
  };

  const API = 'https://api.github.com';
  const TOKEN_KEY = 'gh_admin_token';
  const state = { branch: null, lista: [], ocupado: false };
  const C = CONFIG.campos;

  /* ------------------------------ UTILIDADES ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    children.flat().filter((c) => c !== null && c !== undefined).forEach((c) => n.append(c));
    return n;
  }

  const getToken = () => sessionStorage.getItem(TOKEN_KEY);
  const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

  const utf8ToB64 = (str) => {
    let bin = '';
    new TextEncoder().encode(str).forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  };
  const b64ToUtf8 = (b64) =>
    new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
  const fileToB64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1]);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });

  function nombreSeguro(nombre) {
    const limpio = nombre
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return limpio || 'archivo';
  }

  function mensajeError(e) {
    switch (e.status) {
      case 401: return 'Token inválido o vencido.';
      case 403: return 'Sin permiso (¿el token tiene Contents: Read and write?) o límite de la API alcanzado.';
      case 404: return 'No se encontró el repositorio o archivo, o el token no tiene acceso a este repositorio.';
      case 409: return 'Conflicto: el repositorio cambió mientras trabajabas. Intenta de nuevo.';
      case 422: return 'GitHub rechazó los datos (¿el archivo ya existe?).';
      default: return e.message || 'Error desconocido.';
    }
  }

  /* ------------------------------ API GITHUB ----------------------------- */
  async function gh(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${getToken()}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok) {
      let detalle = '';
      try { detalle = (await res.json()).message || ''; } catch (_) { /* sin cuerpo */ }
      const err = new Error(detalle || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  const contentsUrl = (ruta) => `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${encodePath(ruta)}`;

  const getFile = (ruta) => gh(`${contentsUrl(ruta)}?ref=${encodeURIComponent(state.branch)}`);

  const putFile = (ruta, contentB64, message, sha) =>
    gh(contentsUrl(ruta), {
      method: 'PUT',
      body: JSON.stringify({ message, content: contentB64, branch: state.branch, ...(sha ? { sha } : {}) }),
    });

  const deleteFile = (ruta, sha, message) =>
    gh(contentsUrl(ruta), {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch: state.branch }),
    });

  async function existe(ruta) {
    try { await getFile(ruta); return true; }
    catch (e) { if (e.status === 404) return false; throw e; }
  }

  async function rutaLibre(carpeta, nombre) {
    const ruta = `${carpeta}/${nombre}`;
    if (!(await existe(ruta))) return ruta;
    const i = nombre.lastIndexOf('.');
    const base = i > 0 ? nombre.slice(0, i) : nombre;
    const ext = i > 0 ? nombre.slice(i) : '';
    return `${carpeta}/${base}-${Date.now()}${ext}`;
  }

  /* ------------------------- evidencias.json (datos) ---------------------- */
  function obtenerLista(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.evidencias)) return data.evidencias;
    throw new Error('Formato de evidencias.json no reconocido (se esperaba un arreglo).');
  }

  // Lee, muta y guarda el JSON. Reintenta una vez si hubo conflicto (409).
  async function actualizarJson(mutador, mensajeCommit) {
    for (let intento = 0; intento < 2; intento++) {
      const f = await getFile(CONFIG.jsonPath);
      const data = JSON.parse(b64ToUtf8(f.content));
      mutador(obtenerLista(data));
      try {
        await putFile(CONFIG.jsonPath, utf8ToB64(JSON.stringify(data, null, 2) + '\n'), mensajeCommit, f.sha);
        return data;
      } catch (e) {
        if (e.status === 409 && intento === 0) continue;
        throw e;
      }
    }
  }

  async function cargarLista() {
    const f = await getFile(CONFIG.jsonPath);
    state.lista = obtenerLista(JSON.parse(b64ToUtf8(f.content)));
    renderLista();
  }

  function rutaDe(entrada) {
    let r = String(entrada[C.archivo] || '');
    try { r = decodeURI(r); } catch (_) { /* dejar tal cual */ }
    return r.replace(/^\.?\//, '');
  }

  /* --------------------------------- UI ---------------------------------- */
  const CSS = `
  .adm-fab{position:fixed;left:18px;bottom:18px;z-index:9000;padding:10px 14px;border:1px solid var(--cyan,#00e5ff);
    background:rgba(5,12,20,.92);color:var(--cyan,#00e5ff);font:600 12px 'Orbitron',sans-serif;letter-spacing:1.5px;cursor:pointer}
  .adm-fab:hover{background:var(--cyan,#00e5ff);color:#04121c}
  .adm-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;padding:16px}
  .adm-overlay.open{display:flex}
  .adm-box{width:min(720px,100%);max-height:90vh;overflow:auto;background:#07111c;border:1px solid var(--cyan,#00e5ff);
    color:#dfe9f2;font-family:'Inter',sans-serif;font-size:14px}
  .adm-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(0,229,255,.25)}
  .adm-head h3{margin:0;font:700 14px 'Orbitron',sans-serif;letter-spacing:1.5px;color:var(--cyan,#00e5ff)}
  .adm-body{padding:18px;display:grid;gap:14px}
  .adm-box label{display:grid;gap:5px;font-size:12px;letter-spacing:.5px;color:#9fb3c4}
  .adm-box input,.adm-box select{padding:9px 10px;background:#0b1a29;border:1px solid rgba(0,229,255,.3);color:#fff;font:inherit}
  .adm-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .adm-btn{padding:10px 14px;border:1px solid var(--cyan,#00e5ff);background:transparent;color:var(--cyan,#00e5ff);
    font:600 12px 'Orbitron',sans-serif;letter-spacing:1px;cursor:pointer}
  .adm-btn:hover:not(:disabled){background:var(--cyan,#00e5ff);color:#04121c}
  .adm-btn:disabled{opacity:.45;cursor:not-allowed}
  .adm-btn.danger{border-color:#ff5c6c;color:#ff5c6c}
  .adm-btn.danger:hover:not(:disabled){background:#ff5c6c;color:#1a0408}
  .adm-status{min-height:20px;font-size:13px}
  .adm-status.ok{color:#5CFFA8}.adm-status.err{color:#ff7b88}
  .adm-list{display:grid;gap:8px;max-height:260px;overflow:auto}
  .adm-item{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 10px;border:1px solid rgba(0,229,255,.18)}
  .adm-item small{display:block;color:#7c93a7;word-break:break-all}
  .adm-hint{font-size:12px;color:#7c93a7;line-height:1.5}
  @media(max-width:560px){.adm-row{grid-template-columns:1fr}}`;

  let ui = {};

  function estado(msg, tipo = '') {
    ui.status.textContent = msg;
    ui.status.className = `adm-status ${tipo}`;
  }

  function setOcupado(v) {
    state.ocupado = v;
    ui.overlay.querySelectorAll('button, input, select').forEach((n) => { n.disabled = v; });
  }

  async function conOcupado(fn) {
    if (state.ocupado) return;
    setOcupado(true);
    try { await fn(); }
    catch (e) { estado(mensajeError(e), 'err'); }
    finally { setOcupado(false); }
  }

  function mostrarPanel(conectado) {
    ui.loginPanel.style.display = conectado ? 'none' : 'grid';
    ui.mainPanel.style.display = conectado ? 'grid' : 'none';
  }

  function renderLista() {
    ui.list.replaceChildren();
    if (!state.lista.length) {
      ui.list.append(el('p', { class: 'adm-hint' }, 'No hay evidencias registradas.'));
      return;
    }
    state.lista.forEach((entrada) => {
      const titulo = entrada[C.titulo] || '(sin título)';
      const meta = [entrada[C.semana], entrada[C.actividad], entrada[C.tipo]]
        .filter(Boolean).join(' · ');
      ui.list.append(
        el('div', { class: 'adm-item' },
          el('div', {}, el('strong', {}, titulo), el('small', {}, `${meta ? meta + ' · ' : ''}${entrada[C.archivo] || ''}`)),
          el('button', { class: 'adm-btn danger', type: 'button', onclick: () => eliminar(entrada) }, 'ELIMINAR')
        )
      );
    });
  }

  /* -------------------------------- ACCIONES ------------------------------ */
  async function conectar() {
    const token = ui.token.value.trim();
    if (!token) return estado('Pega tu token de GitHub.', 'err');
    await conOcupado(async () => {
      sessionStorage.setItem(TOKEN_KEY, token);
      try {
        estado('Conectando…');
        const repo = await gh(`/repos/${CONFIG.owner}/${CONFIG.repo}`);
        if (repo.permissions && repo.permissions.push === false) {
          throw new Error('El token no tiene permiso de escritura en este repositorio.');
        }
        state.branch = CONFIG.branch || repo.default_branch;
        await cargarLista();
        ui.token.value = '';
        mostrarPanel(true);
        estado(`Conectado a ${CONFIG.owner}/${CONFIG.repo} (rama ${state.branch}).`, 'ok');
      } catch (e) {
        sessionStorage.removeItem(TOKEN_KEY);
        throw e;
      }
    });
  }

  function desconectar() {
    sessionStorage.removeItem(TOKEN_KEY);
    state.lista = [];
    mostrarPanel(false);
    estado('Sesión cerrada.');
  }

  async function agregar() {
    const semana = ui.semana.value;
    const actividad = ui.actividad.value;
    const tipo = ui.tipo.value;
    const titulo = ui.titulo.value.trim();
    const archivo = ui.archivo.files[0];

    if (!titulo || !archivo) return estado('Completa el título y elige un archivo.', 'err');
    if (archivo.size > CONFIG.maxMB * 1024 * 1024) {
      return estado(`El archivo supera ${CONFIG.maxMB} MB.`, 'err');
    }

    await conOcupado(async () => {
      estado('Subiendo archivo…');
      const ruta = await rutaLibre(CONFIG.carpetaBase(semana, actividad, tipo), nombreSeguro(archivo.name));
      await putFile(ruta, await fileToB64(archivo), `Agregar evidencia: ${titulo}`);

      estado('Registrando en evidencias.json…');
      const data = await actualizarJson((lista) => {
        const id = lista.reduce((max, e) => Math.max(max, Number(e[C.id]) || 0), 0) + 1;
        lista.push({
          [C.id]: id,
          [C.semana]: semana,
          [C.actividad]: actividad,
          [C.titulo]: titulo,
          [C.tipo]: tipo,
          [C.archivo]: ruta,
        });
      }, `Registrar evidencia: ${titulo}`);

      state.lista = obtenerLista(data);
      renderLista();
      ui.titulo.value = '';
      ui.archivo.value = '';
      estado('Listo. GitHub Pages tarda ~1 minuto en publicar; recarga con Ctrl+F5.', 'ok');
    });
  }

  async function eliminar(entrada) {
    const titulo = entrada[C.titulo] || 'esta evidencia';
    const ruta = rutaDe(entrada);
    const protegido = CONFIG.protegidos.some((p) => ruta.startsWith(p));
    const borraArchivo = ruta && !/^https?:/i.test(ruta) && !protegido;
    const aviso = borraArchivo
      ? `¿Eliminar "${titulo}"?\n\nSe quitará del registro y se borrará el archivo:\n${ruta}`
      : `¿Quitar "${titulo}" del registro?` +
        (protegido ? '\n\nEl archivo se conserva porque index.html lo usa directamente.' : '');
    if (!confirm(aviso)) return;

    await conOcupado(async () => {
      estado('Quitando del registro…');
      let restantes = [];
      const data = await actualizarJson((lista) => {
        const i = lista.findIndex((e) => e[C.archivo] === entrada[C.archivo] && e[C.titulo] === entrada[C.titulo]);
        if (i < 0) throw new Error('La evidencia ya no está en el registro.');
        lista.splice(i, 1);
        restantes = lista;
      }, `Eliminar evidencia: ${titulo}`);

      // Primero el registro, luego el archivo: si algo falla, no queda un enlace roto.
      const otraLoUsa = restantes.some((e) => rutaDe(e) === ruta);
      if (borraArchivo && !otraLoUsa) {
        estado('Borrando archivo del repositorio…');
        try {
          const f = await getFile(ruta);
          await deleteFile(ruta, f.sha, `Eliminar archivo: ${ruta}`);
        } catch (e) {
          if (e.status !== 404) throw e; // 404 = el archivo ya no existía
        }
      }

      state.lista = obtenerLista(data);
      renderLista();
      estado('Eliminado. Recarga con Ctrl+F5 en ~1 minuto para verlo reflejado.', 'ok');
    });
  }

  /* ------------------------------ CONSTRUCCIÓN ---------------------------- */
  function construir() {
    document.head.append(el('style', {}, CSS));

    ui.token = el('input', { type: 'password', placeholder: 'github_pat_…', autocomplete: 'off' });
    ui.status = el('div', { class: 'adm-status', role: 'status', 'aria-live': 'polite' });

    ui.loginPanel = el('div', { class: 'adm-body' },
      el('p', { class: 'adm-hint' },
        'Pega un token fine-grained de GitHub (solo este repositorio, permiso Contents: Read and write). ',
        'Se guarda únicamente en esta pestaña.'),
      el('label', {}, 'TOKEN DE GITHUB', ui.token),
      el('button', { class: 'adm-btn', type: 'button', onclick: conectar }, 'CONECTAR')
    );

    const opciones = (arr) => arr.map((v) => el('option', { value: v }, v));
    ui.semana = el('select', {}, ...opciones(CONFIG.semanas));
    ui.actividad = el('select', {}, ...opciones(CONFIG.actividades));
    ui.tipo = el('select', {}, ...opciones(CONFIG.tipos));
    ui.titulo = el('input', { type: 'text', placeholder: 'Título de la evidencia' });
    ui.archivo = el('input', { type: 'file', accept: '.pdf,.png,.jpg,.jpeg,.webp' });
    ui.list = el('div', { class: 'adm-list' });

    ui.mainPanel = el('div', { class: 'adm-body', style: 'display:none' },
      el('div', { class: 'adm-row' },
        el('label', {}, 'SEMANA', ui.semana),
        el('label', {}, 'ACTIVIDAD', ui.actividad),
        el('label', {}, 'TIPO', ui.tipo)),
      el('label', {}, 'TÍTULO', ui.titulo),
      el('label', {}, 'ARCHIVO (PDF o imagen)', ui.archivo),
      el('button', { class: 'adm-btn', type: 'button', onclick: agregar }, 'SUBIR Y REGISTRAR'),
      el('h4', { style: 'margin:6px 0 0;color:var(--cyan,#00e5ff)' }, 'EVIDENCIAS REGISTRADAS'),
      ui.list,
      el('button', { class: 'adm-btn', type: 'button', onclick: desconectar }, 'CERRAR SESIÓN')
    );

    const cerrar = el('button', { class: 'adm-btn', type: 'button', 'aria-label': 'Cerrar', onclick: cerrarPanel }, '✕');

    ui.overlay = el('div', { class: 'adm-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Administrar evidencias' },
      el('div', { class: 'adm-box' },
        el('div', { class: 'adm-head' }, el('h3', {}, 'ADMINISTRAR EVIDENCIAS'), cerrar),
        ui.loginPanel,
        ui.mainPanel,
        el('div', { class: 'adm-body', style: 'padding-top:0' }, ui.status)
      )
    );
    ui.overlay.addEventListener('click', (e) => { if (e.target === ui.overlay) cerrarPanel(); });

    ui.fab = el('button', { class: 'adm-fab', type: 'button', onclick: abrirPanel, title: 'Administrar evidencias' }, 'ADMIN');
    document.body.append(ui.fab, ui.overlay);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ui.overlay.classList.contains('open')) cerrarPanel();
    });

    // Modo página aparte (admin.html): sin botón flotante, panel abierto siempre
    if (window.ADMIN_STANDALONE) {
      ui.fab.style.display = 'none';
      cerrar.style.display = 'none';
      abrirPanel();
    }
  }

  async function abrirPanel() {
    ui.overlay.classList.add('open');
    if (getToken() && !state.branch) {
      // Hay token de esta sesión: reconectar sin pedirlo otra vez
      ui.token.value = getToken();
      await conectar();
    } else {
      mostrarPanel(!!getToken() && !!state.branch);
    }
  }

  function cerrarPanel() {
    if (state.ocupado || window.ADMIN_STANDALONE) return;
    ui.overlay.classList.remove('open');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', construir);
  else construir();
})();
