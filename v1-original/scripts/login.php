<?php
// Conexión a la base de datos
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "totoninin";

// Crear conexión
$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Procesar formulario de login
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST["email"];
    $password = $_POST["pass"];

    // Consultar usuario en la base de datos
    $sql = "SELECT * FROM users WHERE email_us = '$email' AND password_us = '$password'";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
      // Usuario encontrado, iniciar sesión
      session_start();
      $_SESSION["logged_in"] = true;
      $_SESSION["email"] = $email;
      // Redirigir a la página de dashboard
      header("Location: ../paginas/calendario.php");
      exit;
  } else {
      // Usuario no encontrado, error
      $error = "Correo electrónico o contraseña incorrectos";
      $response = array("success" => false, "error" => $error);
      header("Content-Type: application/json");
      echo json_encode($response);
      die();
  }
}

$conn->close();
?>