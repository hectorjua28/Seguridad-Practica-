// Obtener los elementos del formulario
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('registration-form');
  const nombreInput = document.querySelector('.nombre');
  const correoInput = document.querySelector('.correo');
  const passwordInput = document.querySelector('.password');
  const confirmPasswordInput = document.querySelector('.confirm_password');
  const enviarButton = document.getElementById('enviar');

  // Función para validar el formulario
  function validateForm() {
    const nombre = nombreInput.value.trim();
    const correo = correoInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (nombre === '') {
      nombreInput.classList.add('error');
      return false;
    } else {
      nombreInput.classList.remove('error');
    }

    if (correo === '') {
      correoInput.classList.add('error');
      return false;
    } else {
      correoInput.classList.remove('error');
    }

    if (password === '') {
      passwordInput.classList.add('error');
      return false;
    } else {
      passwordInput.classList.remove('error');
    }

    if (confirmPassword === '') {
      confirmPasswordInput.classList.add('error');
      return false;
    } else {
      confirmPasswordInput.classList.remove('error');
    }

    if (password !== confirmPassword) {
      passwordInput.classList.add('error');
      confirmPasswordInput.classList.add('error');
      return false;
    } else {
      passwordInput.classList.remove('error');
      confirmPasswordInput.classList.remove('error');
    }

    return true;
  }

  // Función para enviar el formulario
  function enviarFormulario() {
    if (validateForm()) {
      const formData = new FormData();
      formData.append('nombre', nombreInput.value.trim());
      formData.append('correo', correoInput.value.trim());
      formData.append('password', passwordInput.value.trim());

      fetch('registro.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.text())
      .then(data => console.log(data))
      .catch(error => console.error(error));
    }
  }

  // Agregar evento al botón de enviar
  enviarButton.addEventListener('click', function() {
    form.submit();
  });
});