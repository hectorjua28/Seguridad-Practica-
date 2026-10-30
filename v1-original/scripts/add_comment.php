<!-- add_comment.php -->
<?php
session_start();

if (!isset($_SESSION['correo'])) {
  // Si no hay sesión activa, redirigir a la página de login
  header("Location: login.php");
  exit;
}

if (isset($_SESSION['id'])) {
    $eventId = $_SESSION['id'];
} else {
    die("Error: no se ha proporcionado el ID del evento");
}

// Conectar a la base de datos
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "totoninin";

$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die("Error al conectar a la base de datos: " . $conn->connect_error);
}

// Obtener el comentario desde el formulario
if (isset($_POST['comment'])) {
    $comment = $_POST['comment'];
} else {
    die("Error: no se han recibido los datos del formulario");
}

// Insertar el comentario en la base de datos
$stmt = $conn->prepare("INSERT INTO comments (ID_event, comment) VALUES (?, ?)");
$stmt->bind_param("is", $eventId, $comment);
$stmt->execute();

// Cerrar la conexión
$conn->close();

// Redirigir al usuario de vuelta a la página de detalles del evento
header("Location: ../scripts/evento_detalle.php?id=$eventId");
exit;
?>