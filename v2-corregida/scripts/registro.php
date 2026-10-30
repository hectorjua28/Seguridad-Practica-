<?php
class Registro {
  private $conn;

  public function __construct() {
    require_once __DIR__ . '/../includes/db.php';
    $this->conn = db();
    if ($this->conn->connect_error) {
      die("Error de conexión: " . $this->conn->connect_error);
    }
  }

  public function registrarUsuario($nombre, $correo, $password) {
    $password = password_hash($password, PASSWORD_DEFAULT); // VULN-03 (antes md5)
    $st = $this->conn->prepare("INSERT INTO users (Name_us, email_us, password_us) VALUES (?, ?, ?)"); // VULN-01
    $st->bind_param("sss", $nombre, $correo, $password);
    if ($st->execute()) {
      return true;
    } else {
      return false;
    }
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  if (isset($_POST['nombre']) && isset($_POST['correo']) && isset($_POST['password'])) {
    $nombre = $_POST['nombre'];
    $correo = $_POST['correo'];
    $password = $_POST['password'];

    // Verifica si los campos están vacíos
    if (empty($nombre) || empty($correo) || empty($password)) {
      echo "Error: Campos vacíos";
      exit;
    }

    $registro = new Registro();
    if ($registro->registrarUsuario($nombre, $correo, $password)) {
      echo "Registro exitoso";
      header("Location: index.php");
      exit;
    } else {
      echo "Error al registrar";
      exit;
    }
  } else {
    echo "Error: No se recibieron los datos";
    exit;
  }
}
?>