const menu = document.querySelector('.hamburguesa');
const navegacion = document.querySelector('.navegacion');

document.addEventListener('DOMContentLoaded',()=>{
    eventos();
});

const eventos = () =>{
    menu.addEventListener('click',abrirMenu);
}

const abrirMenu = () => {
    navegacion.classList.remove('ocultar');
    botonCerrar();
}

const botonCerrar = () =>{
    const btnCerrar = document.createElement('p');
    const overlay = document.createElement('div');
    overlay.classList.add('pantalla-completa');
    const body = document.querySelector('body');
    if(document.querySelectorAll('.pantalla-completa').length > 0)return;
    body.appendChild(overlay);
    btnCerrar.textContent = 'x';
    btnCerrar.classList.add('btn-cerrar');
    navegacion.appendChild(btnCerrar);
    cerrarMenu(btnCerrar,overlay);
}

const cerrarMenu = (btnCerrar, overlay) => {
  btnCerrar.addEventListener('click', () => {
    navegacion.classList.add('ocultar');
    overlay.remove();
    btnCerrar.remove();
  });
  overlay.addEventListener('click', () => {
    navegacion.classList.add('ocultar');
    overlay.remove();
    btnCerrar.remove();
  });
};




const form = document.getElementById("contact-form");
const inputElements = form.getElementsByTagName("input");
const textareaElements = form.getElementsByTagName("textarea");
const errorMessages = document.getElementsByClassName("error-message");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  let isFormValid = true;

  for (let i = 0; i < inputElements.length; i++) {
    const inputElement = inputElements[i];
    const errorMessageElement = errorMessages[i];

    if (!inputElement.checkValidity()) {
      isFormValid = false;
      errorMessageElement.textContent = inputElement.validationMessage;
    } else {
      errorMessageElement.textContent = "";
    }
  }

  for (let i = 0; i < textareaElements.length; i++) {
    const textareaElement = textareaElements[i];
    const errorMessageElement = errorMessages[inputElements.length + i];

    if (!textareaElement.checkValidity()) {
      isFormValid = false;
      errorMessageElement.textContent = textareaElement.validationMessage;
    } else {
      errorMessageElement.textContent = "";
    }
  }

  if (isFormValid) {
    form.submit();
  }
});


/* otra cosa de los eventos xd */
document.addEventListener("DOMContentLoaded", function() {
  var meses = document.querySelectorAll('.months span');
  meses.forEach(function(mes) {
      mes.addEventListener('click', function() {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', '../scripts/obtener_eventos_mes.php?mes=' + mes.dataset.mes, true);
          xhr.onload = function() {
              if (xhr.status === 200) {
                  var respuesta = JSON.parse(xhr.responseText);
                  var eventos = respuesta;
                  var html = '';
                  eventos.forEach(function(evento) {
                      html += '<div>';
                      html += '<h2>' + evento.Descripcion_event + '</h2>';
                      html += '<p>Fecha: ' + evento.event_date + ' ' + evento.event_time + '</p>';
                      html += '<img src="' + evento.photo + '" alt="Imagen del evento">';
                      html += '</div>';
                  });
                  document.getElementById('eventos').innerHTML = html;
              }
          };
          xhr.send();
      });
  });
});