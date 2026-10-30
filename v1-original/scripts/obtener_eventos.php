<?php

if (!isset($_SESSION)) {
    session_start();
}

if (!isset($_SESSION['correo'])) {
  // Si no hay sesión activa, redirigir a la página de login
  header("Location: login.php");
  exit;
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

$mes = $_GET['mes'];
$eventos_del_mes = getEventsByMonth($mes);

echo json_encode($eventos_del_mes);

// Cerrar la conexión
$conn->close();

function getEventsByMonth($mes) {
    global $conn;
    $anio_actual = date('Y');
    $eventos_del_mes = array();

    $sql = "SELECT e.*, et.Descripcion AS event_type_description
            FROM events e
            INNER JOIN event_type et ON e.event_type = et.event_type
            WHERE MONTH(e.event_date) = $mes AND YEAR(e.event_date) = $anio_actual";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $eventos_del_mes[] = $row;
        }
    } else {
        echo "No se encontraron eventos para el mes seleccionado.";
    }

    return $eventos_del_mes;
}

?>