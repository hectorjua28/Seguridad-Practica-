<?php
// Conexión a la base de datos
$conn = new mysqli("localhost", "root", "", "totoninin");

// Verificar conexión
if ($conn->connect_error) {
  die("Error de conexión: " . $conn->connect_error);
}

// Verificar si el formulario se ha enviado
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  // Recibir datos del formulario
  $nombre = $_POST['nombre'];
  $correo = $_POST['correo'];
  $password = $_POST['password'];
  $confirm_password = $_POST['confirm_password'];

  // Verificar si los campos están vacíos
  if (empty($nombre) || empty($correo) || empty($password) || empty($confirm_password)) {
    echo "Error: Campos vacíos";
    exit;
  }

  // Verificar si las contraseñas coinciden
  if ($password != $confirm_password) {
    echo "Error: Las contraseñas no coinciden";
    exit;
  }

  // Hash de contraseña
  $hashed_password = password_hash($password, PASSWORD_BCRYPT);

  // Insertar datos en la tabla "users"
  $sql = "INSERT INTO users (Name_us, email_us, password_us) VALUES (?, ?, ?)";
  $stmt = $conn->prepare($sql);
  $stmt->bind_param("sss", $nombre, $correo, $hashed_password);
  $stmt->execute();

  // Verificar si la inserción fue exitosa
  if ($stmt->affected_rows > 0) {
    echo "Registro exitoso";
    header("Location: ../paginas/login.php");
    exit;
  } else {
    echo "Error al registrar";
    exit;
  }
}

// Cerrar conexión
$conn->close();
?>

<!-- index.html -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Totoninin - Registro</title>
  <link rel="stylesheet" href="../css/registro.css">
</head>
<body>

<div class="container">
    <h1>Totoninin - Registro</h1>
    <form id="registration-form" method="post">
      <div class="coolinput">
        <label for="nombre" class="text">Nombre:</label>
        <input type="text" placeholder="Escribe aquí..." name="nombre" class="nombre">
        <label for="correo" class="text">Correo electrónico:</label>
        <input type="email" placeholder="Escribe aquí..." name="correo" class="correo">
        <label for="password" class="text">Contraseña:</label>
        <input type="password" placeholder="Escribe aquí..." name="password" class="password">
        <label for="confirm_password" class="text">Confirmar contraseña:</label>
        <input type="password" placeholder="Escribe aquí..." name="confirm_password" class="confirm_password">
      </div>

      <input type="button" value="Registrarse" id="enviar">
      <a href="login.php">¿Ya tienes cuenta? Inicia sesión</a>
    </form>

    <div class="footer">
      © 2023 Totoninin. Todos los derechos reservados.
    </div>
  </div>

  <script src="../js/registro.js"></script>
</body>
</html>