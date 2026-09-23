/* =========================================================
   CRUD DE EVIDENCIAS
   OPERACIÓN: READ
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    cargarEvidencias();
});


async function cargarEvidencias() {
    const contenedor = document.getElementById("crudEvidencias");
    const contador = document.getElementById("crudContador");

    if (!contenedor) {
        console.error("No se encontró el contenedor #crudEvidencias");
        return;
    }

    try {
        const respuesta = await fetch("datos/evidencias.json", {
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar evidencias.json (${respuesta.status})`
            );
        }

        const evidencias = await respuesta.json();

        contenedor.innerHTML = "";

        if (contador) {
            contador.textContent = `${evidencias.length} evidencias registradas`;
        }

        evidencias.forEach((evidencia) => {
            const tarjeta = document.createElement("article");

            tarjeta.className = "crud-evidencia-card";

            tarjeta.innerHTML = `
                <div class="crud-evidencia-id">
                    ID ${String(evidencia.id).padStart(2, "0")}
                </div>

                <div class="crud-evidencia-content">

                    <span class="crud-evidencia-semana">
                        ${evidencia.semana}
                    </span>

                    <h3>${evidencia.titulo}</h3>

                    <p class="crud-evidencia-actividad">
                        ${evidencia.actividad}
                    </p>

                    <p class="crud-evidencia-tipo">
                        ${evidencia.tipo}
                    </p>

                    <a
                        href="${encodeURI(evidencia.archivo)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="crud-btn-ver"
                    >
                        Ver evidencia
                    </a>

                </div>
            `;

            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al cargar las evidencias:", error);

        if (contador) {
            contador.textContent = "Error al cargar las evidencias";
        }

        contenedor.innerHTML = `
            <div class="crud-error">
                <strong>⚠ No se pudieron cargar las evidencias.</strong>
                <p>
                    Verifica que exista el archivo
                    <code>datos/evidencias.json</code>
                    en el repositorio.
                </p>
            </div>
        `;
    }
});