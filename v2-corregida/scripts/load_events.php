<?php
if (!isset($_SESSION)) {
    require_once __DIR__ . '/../includes/session.php';
    secure_session_start();
}

if (!isset($_SESSION['correo'])) {
    // Si no hay sesión activa, redirigir a la página de login
    header("Location: ../paginas/login.php");
    exit;
}

// Conectar a la base de datos
require_once __DIR__ . '/../includes/db.php';
$conn = db();

// Verificar conexión
if ($conn->connect_error) {
    die("Error al conectar a la base de datos: " . $conn->connect_error);
}

$mes = (int)($_GET['mes'] ?? 0); // VULN-01: parametro numerico
$anio_actual = date('Y');

$sql = "SELECT e.*, et.Descripcion AS event_type_description
        FROM events e
        INNER JOIN event_type et ON e.event_type = et.event_type
        WHERE MONTH(e.event_date) = $mes AND YEAR(e.event_date) = $anio_actual";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        ?>
        <div class="event">
            <h1><?php echo htmlspecialchars($row['Titulo']) ?></h1>
            <img src="<?php echo $row['photo']; ?>" alt="<?php echo htmlspecialchars($row['Descripcion_event']) ?>">
            <h3><?php echo htmlspecialchars($row['Descripcion_event']) ?></h3>
            <p>Fecha: <?php echo date('d/m/Y', strtotime($row['event_date'])) ?> </p>
            <p>Hora: <?php echo $row['event_time'] ?></p>
            <p>Tipo de evento: <?php echo htmlspecialchars($row['event_type_description']) ?></p>
        </div>
        <?php
    }
} else {
    echo "No se encontraron eventos para el mes seleccionado.";
}
// Cerrar la conexión
$conn->close();
?>