<?php
class Registro {
  private $conn;

  public function __construct() {
    $this->conn = new mysqli("localhost", "root", "", "totoninin");
    if ($this->conn->connect_error) {
      die("Error de conexión: " . $this->conn->connect_error);
    }
  }

  public function registrarUsuario($nombre, $correo, $password) {
    $password = md5($password);
    $sql = "INSERT INTO users (Name_us, email_us, password_us) VALUES ('$nombre', '$correo', '$password')";
    $result = $this->conn->query($sql);
    if ($result) {
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