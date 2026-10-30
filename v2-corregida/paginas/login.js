document.getElementById("login-form").addEventListener("submit", function(event) {
  event.preventDefault(); // Evitar que el formulario se envíe automáticamente

  var correo = document.getElementById("correo").value;
  var password = document.getElementById("password").value;

  // Verificar campos vacíos
  if (correo === "" || password === "") {
    document.getElementById("mensaje").textContent = "Error: Campos vacíos";
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
    var mensaje = document.getElementById("mensaje");
    if (data === "success") {
      window.location.href = "calendario.php";
    } else if (data === "admin") {
      window.location.href = "admin.php";
    } else {
      mensaje.textContent = data; // textContent: no interpreta HTML
    }
  })
  .catch(error => {
    console.error("Error al enviar formulario:", error);
  });
  
});