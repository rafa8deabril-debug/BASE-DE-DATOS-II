/* ============================================================
   CRUD DE EVIDENCIAS - PORTAFOLIO BASE DE DATOS II
   ============================================================
   - Usa IndexedDB para guardar las evidencias.
   - Permite CREAR, LEER, EDITAR y ELIMINAR.
   - Guarda imágenes y PDF como Data URL.
   - El administrador puede gestionar.
   - El invitado solo puede visualizar.
   ============================================================ */

(function () {
    "use strict";

    // =========================================================
    // CONFIGURACIÓN DE LA BASE DE DATOS
    // =========================================================

    const DB_NAME = "PortafolioBDII";
    const DB_VERSION = 1;
    const STORE_NAME = "evidencias";

    let db = null;


    // =========================================================
    // ABRIR / CREAR BASE DE DATOS
    // =========================================================

    function abrirBaseDatos() {

        return new Promise((resolve, reject) => {

            const solicitud = indexedDB.open(DB_NAME, DB_VERSION);

            solicitud.onupgradeneeded = function (evento) {

                const baseDatos = evento.target.result;

                if (!baseDatos.objectStoreNames.contains(STORE_NAME)) {

                    const store = baseDatos.createObjectStore(
                        STORE_NAME,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                    store.createIndex(
                        "semana",
                        "semana",
                        { unique: false }
                    );

                    store.createIndex(
                        "actividad",
                        "actividad",
                        { unique: false }
                    );

                    store.createIndex(
                        "fecha",
                        "fecha",
                        { unique: false }
                    );
                }
            };


            solicitud.onsuccess = function (evento) {

                db = evento.target.result;

                db.onerror = function (eventoError) {
                    console.error(
                        "Error en IndexedDB:",
                        eventoError.target.error
                    );
                };

                resolve(db);
            };


            solicitud.onerror = function (evento) {

                console.error(
                    "No se pudo abrir IndexedDB:",
                    evento.target.error
                );

                reject(evento.target.error);
            };

        });
    }



    // =========================================================
    // CONVERTIR ARCHIVO A DATA URL
    // =========================================================

    function archivoComoDataURL(archivo) {

        return new Promise((resolve, reject) => {

            if (!archivo) {
                resolve(null);
                return;
            }

            const lector = new FileReader();

            lector.onload = function () {
                resolve(lector.result);
            };

            lector.onerror = function () {
                reject(
                    new Error("No se pudo leer el archivo.")
                );
            };

            lector.readAsDataURL(archivo);
        });
    }



    // =========================================================
    // GUARDAR EVIDENCIA
    // =========================================================

    function guardarEvidencia(evidencia) {

        return new Promise((resolve, reject) => {

            const transaccion = db.transaction(
                [STORE_NAME],
                "readwrite"
            );

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
    // OBTENER TODAS LAS EVIDENCIAS
    // =========================================================

    function obtenerTodasLasEvidencias() {

        return new Promise((resolve, reject) => {

            const transaccion = db.transaction(
                [STORE_NAME],
                "readonly"
            );

            const store = transaccion.objectStore(STORE_NAME);

            const solicitud = store.getAll();

            solicitud.onsuccess = function () {

                const evidencias = solicitud.result || [];

                evidencias.sort(function (a, b) {

                    if (a.semanaNumero !== b.semanaNumero) {
                        return a.semanaNumero - b.semanaNumero;
                    }

                    return a.actividadNumero - b.actividadNumero;
                });

                resolve(evidencias);
            };

            solicitud.onerror = function () {
                reject(solicitud.error);
            };

        });
    }



    // =========================================================
    // OBTENER UNA EVIDENCIA POR ID
    // =========================================================

    function obtenerEvidenciaPorId(id) {

        return new Promise((resolve, reject) => {

            const transaccion = db.transaction(
                [STORE_NAME],
                "readonly"
            );

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
    // ELIMINAR EVIDENCIA
    // =========================================================

    function eliminarRegistro(id) {

        return new Promise((resolve, reject) => {

            const transaccion = db.transaction(
                [STORE_NAME],
                "readwrite"
            );

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
    // MOSTRAR MENSAJE DEL FORMULARIO
    // =========================================================

    function mostrarMensajeFormulario(
        mensaje,
        tipo = "success"
    ) {

        const elemento =
            document.getElementById("crudFormMessage");

        if (!elemento) {
            return;
        }

        elemento.textContent = mensaje;

        elemento.className =
            "crud-form-message " + tipo;

        setTimeout(function () {

            elemento.textContent = "";

            elemento.className =
                "crud-form-message";

        }, 4000);
    }



    // =========================================================
    // OBTENER NOMBRE DE SEMANA
    // =========================================================

    function nombreSemana(numero) {

        return "SEMANA " +
            String(numero).padStart(2, "0");
    }



    // =========================================================
    // OBTENER NOMBRE DE ACTIVIDAD
    // =========================================================

    function nombreActividad(numero) {

        return "ACTIVIDAD " +
            String(numero).padStart(2, "0");
    }



    // =========================================================
    // RENDERIZAR EVIDENCIAS
    // =========================================================

    async function renderizarEvidencias() {

        const contenedor =
            document.getElementById("crudEvidencias");

        const contador =
            document.getElementById("crudContador");

        if (!contenedor) {
            return;
        }

        contenedor.innerHTML = `
            <div class="crud-loading">
                Cargando evidencias...
            </div>
        `;


        try {

            const evidencias =
                await obtenerTodasLasEvidencias();


            if (contador) {

                contador.textContent =
                    evidencias.length +
                    (
                        evidencias.length === 1
                            ? " evidencia registrada"
                            : " evidencias registradas"
                    );
            }


            if (evidencias.length === 0) {

                contenedor.innerHTML = `
                    <div class="crud-empty">
                        <div class="crud-empty-icon">📂</div>

                        <h3>No hay evidencias registradas</h3>

                        <p>
                            El administrador puede agregar
                            la primera evidencia desde el
                            formulario de gestión.
                        </p>
                    </div>
                `;

                return;
            }


            const esAdministrador =
                document.body.dataset.role === "admin";


            contenedor.innerHTML = "";


            evidencias.forEach(function (evidencia) {

                const tarjeta =
                    document.createElement("article");

                tarjeta.className =
                    "crud-evidencia-card";


                let contenidoArchivo = "";


                // =================================================
                // IMAGEN
                // =================================================

                if (
                    evidencia.tipo === "imagen" &&
                    evidencia.archivo
                ) {

                    contenidoArchivo = `
                        <div class="crud-preview">
                            <img
                                src="${evidencia.archivo}"
                                alt="${escaparHTML(
                                    evidencia.titulo
                                )}"
                            >
                        </div>
                    `;
                }


                // =================================================
                // PDF
                // =================================================

                else if (
                    evidencia.tipo === "pdf" &&
                    evidencia.archivo
                ) {

                    contenidoArchivo = `
                        <div class="crud-preview crud-pdf-preview">

                            <div class="crud-pdf-icon">
                                📄
                            </div>

                            <span>
                                Documento PDF
                            </span>

                        </div>
                    `;
                }


                // =================================================
                // SIN ARCHIVO
                // =================================================

                else {

                    contenidoArchivo = `
                        <div class="crud-preview crud-no-file">

                            <div>
                                📁
                            </div>

                            <span>
                                Sin archivo
                            </span>

                        </div>
                    `;
                }


                // =================================================
                // BOTÓN VER
                // =================================================

                let botonVer = "";

                if (evidencia.archivo) {

                    botonVer = `
                        <button
                            type="button"
                            class="crud-btn-ver"
                            onclick="verEvidenciaCRUD(${evidencia.id})"
                        >
                            👁️ VER EVIDENCIA
                        </button>
                    `;
                }


                // =================================================
                // BOTONES ADMINISTRADOR
                // =================================================

                let botonesAdmin = "";


                if (esAdministrador) {

                    botonesAdmin = `

                        <div class="crud-card-actions">

                            <button
                                type="button"
                                class="crud-btn-editar"
                                onclick="editarDesdeCRUD(${evidencia.id})"
                            >
                                ✏️ EDITAR
                            </button>

                            <button
                                type="button"
                                class="crud-btn-eliminar"
                                onclick="eliminarDesdeCRUD(${evidencia.id})"
                            >
                                🗑️ ELIMINAR
                            </button>

                        </div>

                    `;
                }


                tarjeta.innerHTML = `

                    ${contenidoArchivo}

                    <div class="crud-card-content">

                        <div class="crud-card-week">
                            ${escaparHTML(
                                nombreSemana(
                                    evidencia.semanaNumero
                                )
                            )}
                        </div>

                        <div class="crud-card-activity">
                            ${escaparHTML(
                                nombreActividad(
                                    evidencia.actividadNumero
                                )
                            )}
                        </div>

                        <h3>
                            ${escaparHTML(
                                evidencia.titulo
                            )}
                        </h3>

                        <p>
                            ${escaparHTML(
                                evidencia.descripcion ||
                                "Sin descripción."
                            )}
                        </p>

                        <div class="crud-card-buttons">

                            ${botonVer}

                        </div>

                        ${botonesAdmin}

                    </div>

                `;


                contenedor.appendChild(tarjeta);

            });


        } catch (error) {

            console.error(
                "Error al cargar evidencias:",
                error
            );

            contenedor.innerHTML = `

                <div class="crud-error">

                    <div>⚠️</div>

                    <h3>
                        No se pudieron cargar
                        las evidencias
                    </h3>

                    <p>
                        Verifica que tu navegador
                        permita IndexedDB.
                    </p>

                </div>

            `;
        }
    }



    // =========================================================
    // ESCAPAR HTML
    // =========================================================

    function escaparHTML(texto) {

        if (texto === null || texto === undefined) {
            return "";
        }

        const div =
            document.createElement("div");

        div.textContent = String(texto);

        return div.innerHTML;
    }



    // =========================================================
    // VER EVIDENCIA
    // =========================================================

    async function verEvidenciaCRUD(id) {

        try {

            const evidencia =
                await obtenerEvidenciaPorId(id);


            if (!evidencia) {

                alert(
                    "No se encontró la evidencia."
                );

                return;
            }


            if (!evidencia.archivo) {

                alert(
                    "Esta evidencia no tiene archivo."
                );

                return;
            }


            // =============================================
            // PDF
            // =============================================

            if (evidencia.tipo === "pdf") {

                const ventana =
                    window.open(
                        "",
                        "_blank"
                    );

                if (!ventana) {

                    alert(
                        "El navegador bloqueó la ventana. " +
                        "Permite ventanas emergentes."
                    );

                    return;
                }


                ventana.document.write(`

                    <!DOCTYPE html>

                    <html lang="es">

                    <head>

                        <meta charset="UTF-8">

                        <title>
                            ${escaparHTML(
                                evidencia.titulo
                            )}
                        </title>

                        <style>

                            * {
                                box-sizing: border-box;
                            }

                            body {
                                margin: 0;
                                background: #111;
                                color: white;
                                font-family: Arial, sans-serif;
                            }

                            .titulo {
                                padding: 15px;
                                text-align: center;
                                background: #222;
                            }

                            iframe {
                                width: 100%;
                                height: calc(100vh - 60px);
                                border: none;
                            }

                        </style>

                    </head>

                    <body>

                        <div class="titulo">
                            ${escaparHTML(
                                evidencia.titulo
                            )}
                        </div>

                        <iframe
                            src="${evidencia.archivo}"
                        ></iframe>

                    </body>

                    </html>

                `);

                ventana.document.close();

                return;
            }


            // =============================================
            // IMAGEN
            // =============================================

            if (evidencia.tipo === "imagen") {

                const ventana =
                    window.open(
                        "",
                        "_blank"
                    );

                if (!ventana) {

                    alert(
                        "El navegador bloqueó la ventana. " +
                        "Permite ventanas emergentes."
                    );

                    return;
                }


                ventana.document.write(`

                    <!DOCTYPE html>

                    <html lang="es">

                    <head>

                        <meta charset="UTF-8">

                        <title>
                            ${escaparHTML(
                                evidencia.titulo
                            )}
                        </title>

                        <style>

                            * {
                                box-sizing: border-box;
                            }

                            body {

                                margin: 0;

                                min-height: 100vh;

                                display: flex;

                                align-items: center;

                                justify-content: center;

                                background: #111;

                                padding: 20px;

                            }

                            img {

                                max-width: 100%;

                                max-height: 95vh;

                                object-fit: contain;

                                border-radius: 12px;

                                box-shadow:
                                    0 10px 40px
                                    rgba(0,0,0,.5);

                            }

                        </style>

                    </head>

                    <body>

                        <img
                            src="${evidencia.archivo}"
                            alt="${escaparHTML(
                                evidencia.titulo
                            )}"
                        >

                    </body>

                    </html>

                `);

                ventana.document.close();

            }

        } catch (error) {

            console.error(
                "Error al visualizar:",
                error
            );

            alert(
                "No se pudo abrir la evidencia."
            );
        }
    }



    // =========================================================
    // EDITAR DESDE CRUD
    // =========================================================

    async function editarDesdeCRUD(id) {

        if (
            document.body.dataset.role !== "admin"
        ) {

            alert(
                "Solo el administrador puede editar evidencias."
            );

            return;
        }


        try {

            const evidencia =
                await obtenerEvidenciaPorId(id);


            if (!evidencia) {

                alert(
                    "No se encontró la evidencia."
                );

                return;
            }


            const campoId =
                document.getElementById("crudId");

            const campoSemana =
                document.getElementById("crudSemana");

            const campoActividad =
                document.getElementById("crudActividad");

            const campoTitulo =
                document.getElementById("crudTitulo");

            const campoDescripcion =
                document.getElementById("crudDescripcion");

            const campoTipo =
                document.getElementById("crudTipo");


            if (campoId) {
                campoId.value = evidencia.id;
            }

            if (campoSemana) {
                campoSemana.value =
                    evidencia.semanaNumero;
            }

            if (campoActividad) {
                campoActividad.value =
                    evidencia.actividadNumero;
            }

            if (campoTitulo) {
                campoTitulo.value =
                    evidencia.titulo;
            }

            if (campoDescripcion) {
                campoDescripcion.value =
                    evidencia.descripcion || "";
            }

            if (campoTipo) {
                campoTipo.value =
                    evidencia.tipo;
            }


            const botonGuardar =
                document.getElementById(
                    "crudGuardarBtn"
                );

            if (botonGuardar) {

                botonGuardar.textContent =
                    "💾 ACTUALIZAR EVIDENCIA";
            }


            const botonCancelar =
                document.getElementById(
                    "crudCancelarBtn"
                );

            if (botonCancelar) {

                botonCancelar.style.display =
                    "inline-flex";
            }


            const formulario =
                document.getElementById(
                    "crudForm"
                );

            if (formulario) {

                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        } catch (error) {

            console.error(
                "Error al editar:",
                error
            );

            alert(
                "No se pudo cargar la evidencia para editar."
            );
        }
    }



    // =========================================================
    // ELIMINAR DESDE CRUD
    // =========================================================

    async function eliminarDesdeCRUD(id) {

        if (
            document.body.dataset.role !== "admin"
        ) {

            alert(
                "Solo el administrador puede eliminar evidencias."
            );

            return;
        }


        const evidencia =
            await obtenerEvidenciaPorId(id);


        if (!evidencia) {

            alert(
                "No se encontró la evidencia."
            );

            return;
        }


        const confirmar =
            confirm(
                "¿Estás segura de eliminar esta evidencia?\n\n" +
                evidencia.titulo +
                "\n\nEsta acción no se puede deshacer."
            );


        if (!confirmar) {
            return;
        }


        try {

            await eliminarRegistro(id);

            await renderizarEvidencias();

            mostrarMensajeFormulario(
                "✅ Evidencia eliminada correctamente.",
                "success"
            );

        } catch (error) {

            console.error(
                "Error al eliminar:",
                error
            );

            mostrarMensajeFormulario(
                "❌ No se pudo eliminar la evidencia.",
                "error"
            );
        }
    }



    // =========================================================
    // LIMPIAR FORMULARIO
    // =========================================================

    function limpiarFormularioCRUD() {

        const formulario =
            document.getElementById(
                "crudForm"
            );

        if (formulario) {
            formulario.reset();
        }


        const campoId =
            document.getElementById("crudId");

        if (campoId) {
            campoId.value = "";
        }


        const botonGuardar =
            document.getElementById(
                "crudGuardarBtn"
            );

        if (botonGuardar) {

            botonGuardar.textContent =
                "➕ GUARDAR EVIDENCIA";
        }


        const botonCancelar =
            document.getElementById(
                "crudCancelarBtn"
            );

        if (botonCancelar) {

            botonCancelar.style.display =
                "none";
        }


        const mensaje =
            document.getElementById(
                "crudFormMessage"
            );

        if (mensaje) {

            mensaje.textContent = "";

            mensaje.className =
                "crud-form-message";
        }
    }



    // =========================================================
    // PROCESAR FORMULARIO
    // =========================================================

    async function procesarFormularioCRUD(evento) {

        evento.preventDefault();


        if (
            document.body.dataset.role !== "admin"
        ) {

            mostrarMensajeFormulario(
                "❌ Solo el administrador puede gestionar evidencias.",
                "error"
            );

            return;
        }


        const campoId =
            document.getElementById("crudId");

        const campoSemana =
            document.getElementById("crudSemana");

        const campoActividad =
            document.getElementById("crudActividad");

        const campoTitulo =
            document.getElementById("crudTitulo");

        const campoDescripcion =
            document.getElementById("crudDescripcion");

        const campoTipo =
            document.getElementById("crudTipo");

        const campoArchivo =
            document.getElementById("crudArchivo");


        const id =
            campoId?.value
                ? Number(campoId.value)
                : null;


        const semana =
            Number(
                campoSemana?.value || 0
            );


        const actividad =
            Number(
                campoActividad?.value || 0
            );


        const titulo =
            campoTitulo?.value.trim() || "";


        const descripcion =
            campoDescripcion?.value.trim() || "";


        const tipo =
            campoTipo?.value || "";


        const archivo =
            campoArchivo?.files?.[0] || null;


        // =============================================
        // VALIDACIONES
        // =============================================

        if (!semana) {

            mostrarMensajeFormulario(
                "⚠️ Selecciona una semana.",
                "error"
            );

            return;
        }


        if (!actividad) {

            mostrarMensajeFormulario(
                "⚠️ Selecciona una actividad.",
                "error"
            );

            return;
        }


        if (!titulo) {

            mostrarMensajeFormulario(
                "⚠️ Escribe el título de la evidencia.",
                "error"
            );

            return;
        }


        if (!tipo) {

            mostrarMensajeFormulario(
                "⚠️ Selecciona el tipo de archivo.",
                "error"
            );

            return;
        }


        // =============================================
        // VALIDAR ARCHIVO
        // =============================================

        if (!id && !archivo) {

            mostrarMensajeFormulario(
                "⚠️ Selecciona una imagen o PDF.",
                "error"
            );

            return;
        }


        if (archivo) {

            const tiposImagen = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];


            if (
                tipo === "imagen" &&
                !tiposImagen.includes(archivo.type)
            ) {

                mostrarMensajeFormulario(
                    "⚠️ El archivo seleccionado no es una imagen válida.",
                    "error"
                );

                return;
            }


            if (
                tipo === "pdf" &&
                archivo.type !== "application/pdf"
            ) {

                mostrarMensajeFormulario(
                    "⚠️ Debes seleccionar un archivo PDF.",
                    "error"
                );

                return;
            }


            // Límite aproximado de 10 MB

            if (
                archivo.size >
                10 * 1024 * 1024
            ) {

                mostrarMensajeFormulario(
                    "⚠️ El archivo no debe superar los 10 MB.",
                    "error"
                );

                return;
            }
        }


        try {

            const botonGuardar =
                document.getElementById(
                    "crudGuardarBtn"
                );


            if (botonGuardar) {

                botonGuardar.disabled = true;

                botonGuardar.textContent =
                    "⏳ GUARDANDO...";
            }


            let evidenciaExistente = null;


            // =============================================
            // SI ES EDICIÓN
            // =============================================

            if (id) {

                evidenciaExistente =
                    await obtenerEvidenciaPorId(id);


                if (!evidenciaExistente) {

                    throw new Error(
                        "La evidencia que deseas editar no existe."
                    );
                }
            }


            // =============================================
            // ARCHIVO
            // =============================================

            let archivoData =
                evidenciaExistente?.archivo || null;


            if (archivo) {

                archivoData =
                    await archivoComoDataURL(
                        archivo
                    );
            }


            // =============================================
            // CREAR OBJETO
            // =============================================

            const evidencia = {

                id: id || undefined,

                semanaNumero: semana,

                semana: nombreSemana(semana),

                actividadNumero: actividad,

                actividad: nombreActividad(
                    actividad
                ),

                titulo: titulo,

                descripcion: descripcion,

                tipo: tipo,

                archivo: archivoData,

                nombreArchivo:
                    archivo
                        ? archivo.name
                        : (
                            evidenciaExistente?.nombreArchivo ||
                            ""
                        ),

                fecha:
                    evidenciaExistente?.fecha ||
                    new Date().toISOString(),

                fechaActualizacion:
                    new Date().toISOString()

            };


            // =============================================
            // GUARDAR
            // =============================================

            await guardarEvidencia(
                evidencia
            );


            // =============================================
            // MENSAJE
            // =============================================

            if (id) {

                mostrarMensajeFormulario(
                    "✅ Evidencia actualizada correctamente.",
                    "success"
                );

            } else {

                mostrarMensajeFormulario(
                    "✅ Evidencia registrada correctamente.",
                    "success"
                );
            }


            // =============================================
            // LIMPIAR
            // =============================================

            limpiarFormularioCRUD();


            // =============================================
            // RECARGAR
            // =============================================

            await renderizarEvidencias();


        } catch (error) {

            console.error(
                "Error al guardar evidencia:",
                error
            );


            mostrarMensajeFormulario(
                "❌ " +
                (
                    error.message ||
                    "No se pudo guardar la evidencia."
                ),
                "error"
            );

        } finally {

            const botonGuardar =
                document.getElementById(
                    "crudGuardarBtn"
                );


            if (botonGuardar) {

                botonGuardar.disabled = false;

                botonGuardar.textContent =
                    "➕ GUARDAR EVIDENCIA";
            }
        }
    }



    // =========================================================
    // CONFIGURAR CRUD
    // =========================================================

    async function configurarCRUD() {

        try {

            await abrirBaseDatos();


            const formulario =
                document.getElementById(
                    "crudForm"
                );


            if (formulario) {

                formulario.addEventListener(
                    "submit",
                    procesarFormularioCRUD
                );
            }


            const botonCancelar =
                document.getElementById(
                    "crudCancelarBtn"
                );


            if (botonCancelar) {

                botonCancelar.addEventListener(
                    "click",
                    function () {

                        limpiarFormularioCRUD();

                    }
                );
            }


            await renderizarEvidencias();


        } catch (error) {

            console.error(
                "No se pudo iniciar el CRUD:",
                error
            );


            const contenedor =
                document.getElementById(
                    "crudEvidencias"
                );


            if (contenedor) {

                contenedor.innerHTML = `

                    <div class="crud-error">

                        <div>⚠️</div>

                        <h3>
                            Error al iniciar
                            el sistema de evidencias
                        </h3>

                        <p>
                            No se pudo abrir la base
                            de datos del navegador.
                        </p>

                    </div>

                `;
            }
        }
    }



    // =========================================================
    // CAMBIO DE ROL
    // =========================================================

    document.addEventListener(
        "rolechanged",
        function (evento) {

            const rol =
                evento.detail?.role;


            console.log(
                "Rol cambiado a:",
                rol
            );


            renderizarEvidencias();

        }
    );



    // =========================================================
    // INICIAR CUANDO CARGUE LA PÁGINA
    // =========================================================

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            configurarCRUD
        );

    } else {

        configurarCRUD();

    }



    // =========================================================
    // FUNCIONES DISPONIBLES GLOBALMENTE
    // =========================================================

    window.cargarEvidenciasCRUD =
        renderizarEvidencias;

    window.editarDesdeCRUD =
        editarDesdeCRUD;

    window.eliminarDesdeCRUD =
        eliminarDesdeCRUD;

    window.verEvidenciaCRUD =
        verEvidenciaCRUD;

    window.obtenerTodasLasEvidencias =
        obtenerTodasLasEvidencias;

    window.guardarEvidencia =
        guardarEvidencia;

})();