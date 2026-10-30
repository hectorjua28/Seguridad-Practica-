<?php
// Conexión a la base de datos
require_once __DIR__ . '/../includes/db.php';
$conn = db();

// Verificar conexión
if ($conn->connect_error) {
  die("Error de conexión: " . $conn->connect_error);
}

// Verificar si el formulario se ha enviado
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  // Recibir datos del formulario
  $correo = $_POST['correo'] ?? '';
  $password = $_POST['password'] ?? '';

  // Verificar si los campos están vacíos
  if (empty($correo) || empty($password)) {
    echo "Error: Campos vacíos";
    exit;
  }

  // VULN-01/06: consulta preparada, mensaje generico y regeneracion del ID de sesion
  require_once __DIR__ . '/../includes/auth.php';
  $user = authenticate($conn, trim($correo), $password);
  if ($user) {
    login_user($user['email_us'], $user['Name_us']);
    echo !empty($_SESSION['es_admin']) ? "admin" : "success";
    exit;
  }
  http_response_code(401);
  echo "Error: Credenciales incorrectas";
  exit;
}

// Cerrar conexión
$conn->close();
?>

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Totoninin - Login</title>
  <link rel="stylesheet" href="../css/login.css">
</head>
<body>

  <div class="container">
    <h1>Totoninin - Login</h1>
    <form id="login-form" method="post">
      <div class="coolinput">
            <label for="correo" class="text">Correo electrónico:</label>
            <input type="email" placeholder="Escribe aquí..." id="correo" name="correo" class="correo">
            <label for="password" class="text">Contraseña:</label>
            <input type="password" placeholder="Escribe aquí..." id="password" name="password" class="password">
      </div> 

      <input type="submit" value="Iniciar sesión" id="enviar">
      <a href="registro.php">¿Aún no tiene cuenta? Registrate!!!</a>
    </form>

    <div id="mensaje"></div>

    <div class="footer">
      © 2023 Totoninin. Todos los derechos reservados.
    </div>
  </div>

  <script src="login.js"></script>
</body>
</html>