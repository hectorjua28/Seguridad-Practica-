const meses = document.querySelectorAll('.months span');
const tituloMes = document.getElementById('mes-titulo');
const eventContainer = document.querySelector('.event-container');

// Hacer petición AJAX para obtener los meses
const xhr = new XMLHttpRequest();
xhr.open('GET', '../scripts/meses.php', true);
xhr.onload = function() {
    if (xhr.status === 200) {
        const mesesJSON = JSON.parse(xhr.responseText);
        meses.forEach((mes) => {
            mes.addEventListener('click', () => {
                const mesSeleccionado = mes.getAttribute('data-mes');
                const mesTexto = mesesJSON[mesSeleccionado - 1];
                tituloMes.textContent = `Eventos Programados para el mes de ${mesTexto}`;

                // Remover la clase underline de todos los meses
                meses.forEach((m) => m.classList.remove('underline'));
                // Agregar la clase underline al mes seleccionado
                mes.classList.add('underline');

                // Hacer petición AJAX para obtener los eventos del mes seleccionado
                const xhrEvents = new XMLHttpRequest();
                xhrEvents.open('GET', '../scripts/obtener_eventos.php?mes=' + mesSeleccionado, true);
                xhrEvents.onload = function() {
                    if (xhrEvents.status === 200) {
                        const eventosJSON = JSON.parse(xhrEvents.responseText);
                        eventContainer.innerHTML = '';
                        eventosJSON.forEach((evento) => {
                            const eventoHTML = `
                                <div class="event">
                                    <img src="${evento.photo}" alt="${evento.Descripcion_event}">
                                    <h3>${evento.Descripcion_event}</h3>
                                    <p>Fecha: ${evento.event_date}</p>
                                    <p>Hora: ${evento.event_time}</p>
                                    <p>Tipo de evento: ${evento.event_type_description}</p>
                                    <a href="../scripts/evento_detalle.php?ID_event=${evento.ID_event}">ver más</a>
                                </div>
                            `;
                            eventContainer.innerHTML += eventoHTML;
                        });
                    }
                };
                xhrEvents.send();
            });
        });
    }
};
xhr.send();