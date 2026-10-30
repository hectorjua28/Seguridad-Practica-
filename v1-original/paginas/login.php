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
  $correo = $_POST['correo'];
  $password = $_POST['password'];

  // Verificar si los campos están vacíos
  if (empty($correo) || empty($password)) {
    echo "Error: Campos vacíos";
    exit;
  }

  // Verificar si el correo electrónico existe en la base de datos
  $sql = "SELECT * FROM users WHERE email_us = ?";
  $stmt = $conn->prepare($sql);
  $stmt->bind_param("s", $correo);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    // Verificar si la contraseña es correcta
    if (password_verify($password, $user['password_us'])) {
      // Iniciar sesión
      session_start();
      $_SESSION['correo'] = $correo;
      $_SESSION['nombre'] = $user['Name_us'];
  
      // Verificar si el correo electrónico es el del admin
      if ($correo === 'baldomeroyo@gmail.com') {
        echo "admin"; // Devuelve una respuesta para redirigir al admin
      } else {
        echo "success"; // Devuelve una respuesta de éxito para los clientes
      }
      exit;
    } else {
      echo "Error: Contraseña incorrecta";
      exit;
    }
  } else {
    echo "Error: Correo electrónico no existe";
    exit;
  }
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