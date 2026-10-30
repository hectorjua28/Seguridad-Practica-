document.getElementById("login-form").addEventListener("submit", function(event) {
  event.preventDefault(); // Evitar que el formulario se envíe automáticamente

  var correo = document.getElementById("correo").value;
  var password = document.getElementById("password").value;

  // Verificar campos vacíos
  if (correo === "" || password === "") {
    document.getElementById("mensaje").innerHTML = "Error: Campos vacíos";
    return;
  }

  // Enviar formulario mediante AJAX
  var formData = new FormData(this);
  fetch("login.php", {
    method: "POST",
    body: formData
  })
  .then(response => response.text())
  .then(data => {
    if (data === "Error: Campos vacíos") {
      document.getElementById("mensaje").innerHTML = "Error: Campos vacíos";
    } else if (data === "Error: Correo electrónico no existe") {
      document.getElementById("mensaje").innerHTML = "Error: Correo electrónico no existe";
    } else if (data === "Error: Contraseña incorrecta") {
      document.getElementById("mensaje").innerHTML = "Error: Contraseña incorrecta";
    } else if (data === "success") {
      // Iniciar sesión exitosa, redirigir a la página de inicio para clientes
      window.location.href = "calendario.php";
    } else if (data === "admin") {
      // Iniciar sesión exitosa, redirigir a la página de admin
      window.location.href = "admin.php"; // Cambia esta URL por la que desees
    }
  })
  .catch(error => {
    console.error("Error al enviar formulario:", error);
  });
  
});