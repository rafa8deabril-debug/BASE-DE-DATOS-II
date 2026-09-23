/* ============================================================
   CRUD DE EVIDENCIAS - PORTAFOLIO BASE DE DATOS II
   ============================================================
   FUNCIONES:
   - Crear evidencias
   - Leer evidencias
   - Editar evidencias
   - Eliminar evidencias
   - Guardar imágenes y PDF en IndexedDB
   - Relacionar evidencias con Semana 01 - 04
   - Relacionar evidencias con Actividad 01 - 09
   - Mostrar las evidencias dentro de cada semana
   - Administrador: puede gestionar
   - Invitado: solo puede visualizar
   ============================================================ */

(function () {

    "use strict";

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const DB_NAME = "PortafolioBDII";
    const DB_VERSION = 1;
    const STORE_NAME = "evidencias";

    let db = null;


    // =========================================================
    // ABRIR BASE DE DATOS
    // =========================================================

    function abrirBaseDatos() {

        return new Promise(function (resolve, reject) {

            const solicitud = indexedDB.open(DB_NAME, DB_VERSION);

            solicitud.onupgradeneeded = function (evento) {

                const baseDatos = evento.target.result;

                if (!baseDatos.objectStoreNames.contains(STORE_NAME)) {

                    const store = baseDatos.createObjectStore(STORE_NAME, {
                        keyPath: "id",
                        autoIncrement: true
                    });

                    store.createIndex("semana", "semana", { unique: false });
                    store.createIndex("actividad", "actividad", { unique: false });
                    store.createIndex("fecha", "fecha", { unique: false });

                }

            };

            solicitud.onsuccess = function (evento) {

                db = evento.target.result;
                console.log("✅ IndexedDB conectada correctamente.");
                resolve(db);

            };

            solicitud.onerror = function (evento) {

                console.error("❌ Error al abrir IndexedDB:", evento.target.error);
                reject(evento.target.error);

            };

        });

    }


    // =========================================================
    // CONVERTIR ARCHIVO A DATA URL
    // =========================================================

    function archivoComoDataURL(archivo) {

        return new Promise(function (resolve, reject) {

            if (!archivo) {
                resolve(null);
                return;
            }

            const lector = new FileReader();

            lector.onload = function () {
                resolve(lector.result);
            };

            lector.onerror = function () {
                reject(new Error("No se pudo leer el archivo."));
            };

            lector.readAsDataURL(archivo);

        });

    }


    // =========================================================
    // GUARDAR
    // =========================================================

    function guardarEvidencia(evidencia) {

        return new Promise(function (resolve, reject) {

            const transaccion = db.transaction([STORE_NAME], "readwrite");
            const store = transaccion.objectStore(STORE_NAME);
            const solicitud = store.put(evidencia);

            solicitud.onsuccess = function () {
                resolve(solicitud.result);
            };

            solicitud.onerror = function () {
                reject(solicitud.error);
            };

        });

    }


    // =========================================================
    // OBTENER TODAS
    // =========================================================

    function obtenerTodasLasEvidencias() {

        return new Promise(function (resolve, reject) {

            const transaccion = db.transaction([STORE_NAME], "readonly");
            const store = transaccion.objectStore(STORE_NAME);
            const solicitud = store.getAll();

            solicitud.onsuccess = function () {

                const evidencias = solicitud.result || [];

                evidencias.sort(function (a, b) {

                    if (Number(a.semanaNumero) !== Number(b.semanaNumero)) {
                        return Number(a.semanaNumero) - Number(b.semanaNumero);
                    }

                    return Number(a.actividadNumero) - Number(b.actividadNumero);

                });

                resolve(evidencias);

            };

            solicitud.onerror = function () {
                reject(solicitud.error);
            };

        });

    }


    // =========================================================
    // OBTENER POR ID
    // =========================================================

    function obtenerEvidenciaPorId(id) {

        return new Promise(function (resolve, reject) {

            const transaccion = db.transaction([STORE_NAME], "readonly");
            const store = transaccion.objectStore(STORE_NAME);
            const solicitud = store.get(Number(id));

            solicitud.onsuccess = function () {
                resolve(solicitud.result);
            };

            solicitud.onerror = function () {
                reject(solicitud.error);
            };

        });

    }


    // =========================================================
    // ELIMINAR
    // =========================================================

    function eliminarRegistro(id) {

        return new Promise(function (resolve, reject) {

            const transaccion = db.transaction([STORE_NAME], "readwrite");
            const store = transaccion.objectStore(STORE_NAME);
            const solicitud = store.delete(Number(id));

            solicitud.onsuccess = function () {
                resolve(true);
            };

            solicitud.onerror = function () {
                reject(solicitud.error);
            };

        });

    }


    // =========================================================
    // NOMBRE DE SEMANA / ACTIVIDAD
    // =========================================================

    function nombreSemana(numero) {
        return "SEMANA " + String(numero).padStart(2, "0");
    }

    function nombreActividad(numero) {
        return "ACTIVIDAD " + String(numero).padStart(2, "0");
    }


    // =========================================================
    // ESCAPAR HTML
    // =========================================================

    function escaparHTML(texto) {

        if (texto === null || texto === undefined) {
            return "";
        }

        const div = document.createElement("div");
        div.textContent = String(texto);
        return div.innerHTML;

    }


    // =========================================================
    // MENSAJES
    // =========================================================

    function mostrarMensajeFormulario(mensaje, tipo) {

        const elemento = document.getElementById("crudFormMessage");

        if (!elemento) {
            return;
        }

        elemento.textContent = mensaje;
        elemento.className = "crud-form-message " + (tipo || "success");

        setTimeout(function () {
            elemento.textContent = "";
            elemento.className = "crud-form-message";
        }, 4000);

    }


    // =========================================================
    // PREPARAR SEMANAS
    // =========================================================

    function prepararEstructuraSemanas() {

        const semanas = document.querySelectorAll(".week-card");

        semanas.forEach(function (tarjeta, indice) {

            let numeroSemana = indice + 1;

            const etiqueta = tarjeta.dataset.weekLabel || "";
            const resultado = etiqueta.match(/(\d+)/);

            if (resultado) {
                numeroSemana = Number(resultado[1]);
            }

            if (numeroSemana < 1 || numeroSemana > 4) {
                return;
            }

            // -------------------------------------------------
            // BUSCAR BOTÓN (se agrega como caja lateral,
            // hermana de .week-card-main, dentro de .week-card)
            // -------------------------------------------------

            let boton = tarjeta.querySelector(".week-evidence-btn");

            if (!boton) {

                boton = document.createElement("button");
                boton.type = "button";
                boton.className = "week-evidence-btn";
                boton.innerHTML = '<i class="fa-solid fa-images"></i> VER EVIDENCIAS';

                tarjeta.appendChild(boton);

            }

            // -------------------------------------------------
            // BUSCAR PANEL
            // -------------------------------------------------

            let panel = null;
            const target = boton.dataset.evidenceTarget;

            if (target) {
                panel = document.getElementById(target);
            }

            if (!panel) {
                panel = tarjeta.querySelector(".week-evidence-panel");
            }

            // -------------------------------------------------
            // CREAR PANEL SI NO EXISTE
            // -------------------------------------------------

            if (!panel) {

                panel = document.createElement("section");
                panel.className = "week-evidence-panel";
                panel.hidden = true;
                panel.id = "evidenciasSemana" + numeroSemana;

                panel.innerHTML = `
                    <div class="week-evidence-heading">
                        <span>EVIDENCIAS</span>
                        <h3>${nombreSemana(numeroSemana)}</h3>
                        <p>Actividades registradas mediante el sistema CRUD.</p>
                    </div>
                    <div class="infographic-grid crud-week-infographic-grid"></div>
                `;

                tarjeta.insertAdjacentElement("afterend", panel);

            }

            // -------------------------------------------------
            // RELACIONAR BOTÓN Y PANEL
            // -------------------------------------------------

            boton.dataset.evidenceTarget = panel.id;
            boton.setAttribute("aria-controls", panel.id);

            if (!boton.dataset.crudListener) {

                boton.addEventListener("click", function (evento) {

                    evento.preventDefault();
                    evento.stopPropagation();

                    const oculto = panel.hidden;
                    panel.hidden = !oculto;

                    boton.classList.toggle("active", oculto);
                    boton.setAttribute("aria-expanded", oculto ? "true" : "false");

                    if (oculto) {
                        setTimeout(function () {
                            panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }, 100);
                    }

                });

                boton.dataset.crudListener = "true";

            }

        });

    }


    // =========================================================
    // CREAR TARJETA CRUD (listado general)
    // =========================================================

    function crearTarjetaCRUD(evidencia, esAdministrador) {

        const tarjeta = document.createElement("article");
        tarjeta.className = "crud-evidencia-card";

        let archivoHTML = "";

        if (evidencia.tipo === "imagen" && evidencia.archivo) {

            archivoHTML = `
                <div class="crud-preview">
                    <img src="${evidencia.archivo}" alt="${escaparHTML(evidencia.titulo)}">
                </div>
            `;

        } else if (evidencia.tipo === "pdf" && evidencia.archivo) {

            archivoHTML = `
                <div class="crud-preview crud-pdf-preview">
                    <div class="crud-pdf-icon">📄</div>
                    <span>Documento PDF</span>
                </div>
            `;

        } else {

            archivoHTML = `
                <div class="crud-preview crud-no-file">
                    <div>📁</div>
                    <span>Sin archivo</span>
                </div>
            `;

        }

        let botonVer = "";

        if (evidencia.archivo) {

            botonVer = `
                <button type="button" class="crud-btn-ver" onclick="verEvidenciaCRUD(${evidencia.id})">
                    👁️ VER EVIDENCIA
                </button>
            `;

        }

        let botonesAdmin = "";

        if (esAdministrador) {

            botonesAdmin = `
                <div class="crud-card-actions">
                    <button type="button" class="crud-btn-editar" onclick="editarDesdeCRUD(${evidencia.id})">
                        ✏️ EDITAR
                    </button>
                    <button type="button" class="crud-btn-eliminar" onclick="eliminarDesdeCRUD(${evidencia.id})">
                        🗑️ ELIMINAR
                    </button>
                </div>
            `;

        }

        tarjeta.innerHTML = `
            ${archivoHTML}
            <div class="crud-card-content">
                <div class="crud-card-week">${escaparHTML(nombreSemana(evidencia.semanaNumero))}</div>
                <div class="crud-card-activity">${escaparHTML(nombreActividad(evidencia.actividadNumero))}</div>
                <h3>${escaparHTML(evidencia.titulo)}</h3>
                <p>${escaparHTML(evidencia.descripcion || "Sin descripción.")}</p>
                <div class="crud-card-buttons">${botonVer}</div>
                ${botonesAdmin}
            </div>
        `;

        return tarjeta;

    }


    // =========================================================
    // CREAR TARJETA DE ACTIVIDAD (dentro del panel por semana)
    // =========================================================

    function crearTarjetaActividad(evidencia) {

        const tarjeta = document.createElement("article");
        tarjeta.className = "infographic-card crud-dynamic-infographic";

        let visual = "";

        if (evidencia.tipo === "imagen" && evidencia.archivo) {

            visual = `
                <div class="infographic-image-wrap">
                    <img src="${evidencia.archivo}" alt="${escaparHTML(evidencia.titulo)}" loading="lazy">
                </div>
            `;

        } else {

            visual = `
                <div class="infographic-image-wrap crud-dynamic-file">
                    <div class="crud-dynamic-file-icon">${evidencia.tipo === "pdf" ? "📄" : "📁"}</div>
                    <span>${evidencia.tipo === "pdf" ? "DOCUMENTO PDF" : "ARCHIVO"}</span>
                </div>
            `;

        }

        tarjeta.innerHTML = `
            <div class="infographic-number">${String(evidencia.actividadNumero).padStart(2, "0")}</div>
            ${visual}
            <div class="infographic-info">
                <span>
                    ${escaparHTML(nombreSemana(evidencia.semanaNumero))}
                    ·
                    ${escaparHTML(nombreActividad(evidencia.actividadNumero))}
                </span>
                <h4>${escaparHTML(evidencia.titulo)}</h4>
                <p>${escaparHTML(evidencia.descripcion || "Sin descripción.")}</p>
                <button type="button" class="infographic-btn" onclick="verEvidenciaCRUD(${evidencia.id})">
                    Ver evidencia
                    <i class="fa-solid fa-expand"></i>
                </button>
            </div>
        `;

        return tarjeta;

    }


    // =========================================================
    // MOSTRAR EVIDENCIAS EN LAS SEMANAS
    // =========================================================

    function renderizarEnSemanas(evidencias) {

        prepararEstructuraSemanas();

        for (let semana = 1; semana <= 4; semana++) {

            const panel = document.getElementById("evidenciasSemana" + semana);

            if (!panel) {
                continue;
            }

            let contenedor = panel.querySelector(".crud-week-infographic-grid");

            if (!contenedor) {

                contenedor = document.createElement("div");
                contenedor.className = "infographic-grid crud-week-infographic-grid";
                panel.appendChild(contenedor);

            }

            contenedor.innerHTML = "";

            const lista = evidencias.filter(function (evidencia) {
                return Number(evidencia.semanaNumero) === semana;
            });

            if (lista.length === 0) {

                contenedor.innerHTML = `
                    <div class="crud-week-empty">
                        <span>📂</span>
                        <strong>Sin evidencias CRUD</strong>
                        <small>El administrador puede registrar actividades de esta semana.</small>
                    </div>
                `;

                continue;

            }

            lista.forEach(function (evidencia) {
                contenedor.appendChild(crearTarjetaActividad(evidencia));
            });

        }

    }


    // =========================================================
    // MOSTRAR CRUD GENERAL
    // =========================================================

    async function renderizarEvidencias() {

        const contenedor = document.getElementById("crudEvidencias");
        const contador = document.getElementById("crudContador");

        try {

            const evidencias = await obtenerTodasLasEvidencias();

            if (contador) {
                contador.textContent = evidencias.length +
                    (evidencias.length === 1 ? " evidencia registrada" : " evidencias registradas");
            }

            renderizarEnSemanas(evidencias);

            if (!contenedor) {
                return;
            }

            contenedor.innerHTML = "";

            if (evidencias.length === 0) {

                contenedor.innerHTML = `
                    <div class="crud-empty">
                        <div class="crud-empty-icon">📂</div>
                        <h3>No hay evidencias registradas</h3>
                        <p>El administrador puede agregar la primera evidencia.</p>
                    </div>
                `;

                return;

            }

            const esAdministrador = document.body.dataset.role === "admin";

            evidencias.forEach(function (evidencia) {
                contenedor.appendChild(crearTarjetaCRUD(evidencia, esAdministrador));
            });

        } catch (error) {

            console.error("Error al cargar evidencias:", error);

            if (contenedor) {

                contenedor.innerHTML = `
                    <div class="crud-error">
                        <div>⚠️</div>
                        <h3>No se pudieron cargar las evidencias</h3>
                        <p>Verifica que tu navegador permita IndexedDB.</p>
                    </div>
                `;

            }

        }

    }


    // =========================================================
    // VER EVIDENCIA
    // =========================================================

    async function verEvidenciaCRUD(id) {

        try {

            const evidencia = await obtenerEvidenciaPorId(id);

            if (!evidencia || !evidencia.archivo) {
                alert("No se encontró el archivo.");
                return;
            }

            const ventana = window.open("", "_blank");

            if (!ventana) {
                alert("El navegador bloqueó la ventana. Permite ventanas emergentes.");
                return;
            }

            const titulo = escaparHTML(evidencia.titulo);

            if (evidencia.tipo === "pdf") {

                ventana.document.write(`
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <title>${titulo}</title>
                        <style>
                            * { box-sizing: border-box; }
                            body { margin: 0; background: #080b12; color: white; font-family: Arial, sans-serif; }
                            .titulo { padding: 16px; text-align: center; background: #111827; border-bottom: 1px solid #263244; font-weight: bold; }
                            iframe { width: 100%; height: calc(100vh - 58px); border: none; }
                        </style>
                    </head>
                    <body>
                        <div class="titulo">${titulo}</div>
                        <iframe src="${evidencia.archivo}"></iframe>
                    </body>
                    </html>
                `);

            } else {

                ventana.document.write(`
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <title>${titulo}</title>
                        <style>
                            * { box-sizing: border-box; }
                            body {
                                margin: 0; min-height: 100vh; display: flex; flex-direction: column;
                                align-items: center; justify-content: center; gap: 18px;
                                background: #080b12; padding: 20px; color: white; font-family: Arial, sans-serif;
                            }
                            h2 { margin: 0; text-align: center; }
                            img {
                                max-width: 100%; max-height: 88vh; object-fit: contain;
                                border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,.55);
                            }
                        </style>
                    </head>
                    <body>
                        <h2>${titulo}</h2>
                        <img src="${evidencia.archivo}" alt="${titulo}">
                    </body>
                    </html>
                `);

            }

            ventana.document.close();

        } catch (error) {

            console.error("Error al visualizar:", error);
            alert("No se pudo abrir la evidencia.");

        }

    }


    // =========================================================
    // EDITAR
    // =========================================================

    async function editarDesdeCRUD(id) {

        if (document.body.dataset.role !== "admin") {
            alert("Solo el administrador puede editar.");
            return;
        }

        try {

            const evidencia = await obtenerEvidenciaPorId(id);

            if (!evidencia) {
                alert("No se encontró la evidencia.");
                return;
            }

            const campoId = document.getElementById("crudId");
            const campoSemana = document.getElementById("crudSemana");
            const campoActividad = document.getElementById("crudActividad");
            const campoTitulo = document.getElementById("crudTitulo");
            const campoDescripcion = document.getElementById("crudDescripcion");
            const campoTipo = document.getElementById("crudTipo");

            if (campoId) campoId.value = evidencia.id;
            if (campoSemana) campoSemana.value = "SEMANA " + String(evidencia.semanaNumero).padStart(2, "0");
            if (campoActividad) campoActividad.value = String(evidencia.actividadNumero).padStart(2, "0");
            if (campoTitulo) campoTitulo.value = evidencia.titulo;
            if (campoDescripcion) campoDescripcion.value = evidencia.descripcion || "";
            if (campoTipo) campoTipo.value = evidencia.tipo;

            const botonGuardar = document.getElementById("crudGuardarBtn");
            if (botonGuardar) botonGuardar.textContent = "💾 ACTUALIZAR EVIDENCIA";

            const botonCancelar = document.getElementById("crudCancelarBtn");
            if (botonCancelar) botonCancelar.style.display = "inline-flex";

            const formulario = document.getElementById("crudForm");
            if (formulario) formulario.scrollIntoView({ behavior: "smooth", block: "start" });

        } catch (error) {

            console.error("Error al editar:", error);
            alert("No se pudo cargar la evidencia.");

        }

    }


    // =========================================================
    // ELIMINAR
    // =========================================================

    async function eliminarDesdeCRUD(id) {

        if (document.body.dataset.role !== "admin") {
            alert("Solo el administrador puede eliminar.");
            return;
        }

        try {

            const evidencia = await obtenerEvidenciaPorId(id);

            if (!evidencia) {
                alert("No se encontró la evidencia.");
                return;
            }

            const confirmar = confirm(
                "¿Estás segura de eliminar esta evidencia?\n\n" +
                evidencia.titulo +
                "\n\nEsta acción no se puede deshacer."
            );

            if (!confirmar) {
                return;
            }

            await eliminarRegistro(id);
            await renderizarEvidencias();

            mostrarMensajeFormulario("✅ Evidencia eliminada correctamente.", "success");

        } catch (error) {

            console.error("Error al eliminar:", error);
            mostrarMensajeFormulario("❌ No se pudo eliminar la evidencia.", "error");

        }

    }


    // =========================================================
    // LIMPIAR FORMULARIO
    // =========================================================

    function limpiarFormularioCRUD() {

        const formulario = document.getElementById("crudForm");
        if (formulario) formulario.reset();

        const campoId = document.getElementById("crudId");
        if (campoId) campoId.value = "";

        const botonGuardar = document.getElementById("crudGuardarBtn");
        if (botonGuardar) botonGuardar.textContent = "➕ GUARDAR EVIDENCIA";

        const botonCancelar = document.getElementById("crudCancelarBtn");
        if (botonCancelar) botonCancelar.style.display = "none";

        const mensaje = document.getElementById("crudFormMessage");
        if (mensaje) {
            mensaje.textContent = "";
            mensaje.className = "crud-form-message";
        }

    }


    // =========================================================
    // PROCESAR FORMULARIO
    // =========================================================

    async function procesarFormularioCRUD(evento) {

        evento.preventDefault();

        if (document.body.dataset.role !== "admin") {
            mostrarMensajeFormulario("❌ Solo el administrador puede gestionar evidencias.", "error");
            return;
        }

        const campoId = document.getElementById("crudId");
        const campoSemana = document.getElementById("crudSemana");
        const campoActividad = document.getElementById("crudActividad");
        const campoTitulo = document.getElementById("crudTitulo");
        const campoDescripcion = document.getElementById("crudDescripcion");
        const campoTipo = document.getElementById("crudTipo");
        const campoArchivo = document.getElementById("crudArchivo");

        const id = campoId && campoId.value ? Number(campoId.value) : null;

        // Los <option> de semana y actividad usan valores tipo "SEMANA 01" / "01".
        // Se extrae el número real con una expresión regular en vez de Number()
        // directo, porque Number("SEMANA 01") sería NaN.
        const semanaTexto = campoSemana?.value || "";
        const actividadTexto = campoActividad?.value || "";

        const semanaMatch = semanaTexto.match(/(\d+)/);
        const actividadMatch = actividadTexto.match(/(\d+)/);

        const semana = semanaMatch ? Number(semanaMatch[1]) : 0;
        const actividad = actividadMatch ? Number(actividadMatch[1]) : 0;

        const titulo = campoTitulo?.value.trim() || "";
        const descripcion = campoDescripcion?.value.trim() || "";
        const tipo = campoTipo?.value || "";
        const archivo = campoArchivo?.files?.[0] || null;

        // -------------------------------------------------
        // VALIDACIONES
        // -------------------------------------------------

        if (semana < 1 || semana > 4) {
            mostrarMensajeFormulario("⚠️ Selecciona una semana válida.", "error");
            return;
        }

        if (actividad < 1 || actividad > 9) {
            mostrarMensajeFormulario("⚠️ Selecciona una actividad válida.", "error");
            return;
        }

        if (!titulo) {
            mostrarMensajeFormulario("⚠️ Escribe el título de la evidencia.", "error");
            return;
        }

        if (!tipo) {
            mostrarMensajeFormulario("⚠️ Selecciona el tipo de archivo.", "error");
            return;
        }

        if (!id && !archivo) {
            mostrarMensajeFormulario("⚠️ Selecciona una imagen o PDF.", "error");
            return;
        }

        // -------------------------------------------------
        // VALIDAR ARCHIVO
        // -------------------------------------------------

        if (archivo) {

            const tiposImagen = ["image/jpeg", "image/png", "image/webp", "image/gif"];

            if (tipo === "imagen" && !tiposImagen.includes(archivo.type)) {
                mostrarMensajeFormulario("⚠️ El archivo seleccionado no es una imagen válida.", "error");
                return;
            }

            if (tipo === "pdf" && archivo.type !== "application/pdf") {
                mostrarMensajeFormulario("⚠️ Debes seleccionar un archivo PDF.", "error");
                return;
            }

            if (archivo.size > 10 * 1024 * 1024) {
                mostrarMensajeFormulario("⚠️ El archivo no debe superar los 10 MB.", "error");
                return;
            }

        }

        const botonGuardar = document.getElementById("crudGuardarBtn");
        const textoOriginalBoton = botonGuardar ? botonGuardar.textContent : "➕ GUARDAR EVIDENCIA";

        try {

            if (botonGuardar) {
                botonGuardar.disabled = true;
                botonGuardar.textContent = "⏳ GUARDANDO...";
            }

            let evidenciaExistente = null;

            if (id) {

                evidenciaExistente = await obtenerEvidenciaPorId(id);

                if (!evidenciaExistente) {
                    throw new Error("La evidencia no existe.");
                }

            }

            let archivoData = evidenciaExistente?.archivo || null;

            if (archivo) {
                archivoData = await archivoComoDataURL(archivo);
            }

            const evidencia = {
                id: id || undefined,
                semanaNumero: semana,
                semana: nombreSemana(semana),
                actividadNumero: actividad,
                actividad: nombreActividad(actividad),
                titulo: titulo,
                descripcion: descripcion,
                tipo: tipo,
                archivo: archivoData,
                nombreArchivo: archivo ? archivo.name : (evidenciaExistente?.nombreArchivo || ""),
                fecha: evidenciaExistente?.fecha || new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            };

            await guardarEvidencia(evidencia);

            mostrarMensajeFormulario(
                id ? "✅ Evidencia actualizada correctamente." : "✅ Evidencia registrada correctamente.",
                "success"
            );

            limpiarFormularioCRUD();
            await renderizarEvidencias();

        } catch (error) {

            console.error("Error al guardar:", error);
            mostrarMensajeFormulario("❌ " + (error.message || "No se pudo guardar la evidencia."), "error");

            // Si falla, se restaura el texto que tenía el botón (Guardar o
            // Actualizar) en vez de forzar siempre "Guardar", para no perder
            // el modo edición si estaba activo.
            if (botonGuardar) {
                botonGuardar.textContent = textoOriginalBoton;
            }

        } finally {

            if (botonGuardar) {
                botonGuardar.disabled = false;
            }

        }

    }


    // =========================================================
    // CONFIGURAR CRUD
    // =========================================================

    async function configurarCRUD() {

        try {

            await abrirBaseDatos();

            const formulario = document.getElementById("crudForm");

            if (formulario && !formulario.dataset.crudListener) {
                formulario.addEventListener("submit", procesarFormularioCRUD);
                formulario.dataset.crudListener = "true";
            }

            const botonCancelar = document.getElementById("crudCancelarBtn");

            if (botonCancelar && !botonCancelar.dataset.crudListener) {
                botonCancelar.addEventListener("click", limpiarFormularioCRUD);
                botonCancelar.dataset.crudListener = "true";
            }

            await renderizarEvidencias();

            console.log("✅ CRUD de evidencias iniciado correctamente.");

        } catch (error) {

            console.error("❌ No se pudo iniciar el CRUD:", error);

            const contenedor = document.getElementById("crudEvidencias");

            if (contenedor) {

                contenedor.innerHTML = `
                    <div class="crud-error">
                        <div>⚠️</div>
                        <h3>Error al iniciar el sistema de evidencias</h3>
                        <p>No se pudo abrir la base de datos.</p>
                    </div>
                `;

            }

        }

    }


    // =========================================================
    // CAMBIO DE ROL
    // =========================================================

    document.addEventListener("rolechanged", function () {
        renderizarEvidencias();
    });


    // =========================================================
    // INICIAR
    // =========================================================

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", configurarCRUD);
    } else {
        configurarCRUD();
    }


    // =========================================================
    // FUNCIONES GLOBALES
    // =========================================================

    window.cargarEvidenciasCRUD = renderizarEvidencias;
    window.editarDesdeCRUD = editarDesdeCRUD;
    window.eliminarDesdeCRUD = eliminarDesdeCRUD;
    window.verEvidenciaCRUD = verEvidenciaCRUD;
    window.obtenerTodasLasEvidencias = obtenerTodasLasEvidencias;
    window.guardarEvidencia = guardarEvidencia;

})();