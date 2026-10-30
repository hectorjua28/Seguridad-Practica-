<?php
require_once __DIR__ . '/../includes/session.php';
    secure_session_start();

// Obtener el ID del evento desde la URL
$eventId = $_GET['id'];

// Setear la variable de sesión
$_SESSION['eventId'] = $eventId;

if (!isset($_SESSION['correo'])) {
  // Si no hay sesión activa, redirigir a la página de login
  header("Location: login.php");
  exit;
}
// Conectar a la base de datos
require_once __DIR__ . '/../includes/db.php';
$conn = db();

// Verificar conexión
if ($conn->connect_error) {
    die("Error al conectar a la base de datos: " . $conn->connect_error);
}

// Verificar si se proporcionó el ID del evento
if (isset($_GET['ID_event'])) {
    $eventId = $_GET['ID_event'];
    $_SESSION['eventId'] = $eventId; // Guardar el ID del evento en la sesión

    // Consulta para obtener el evento detallado
    $stmt = $conn->prepare("SELECT * FROM events WHERE ID_event = ?");
    $stmt->bind_param("i", $eventId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $evento = $result->fetch_assoc();
    } else {
        echo "Evento no encontrado.";
        exit;
    }

    // Consulta para obtener los comentarios del evento
    $stmt = $conn->prepare("SELECT * FROM comments WHERE ID_event = ?");
    $stmt->bind_param("i", $eventId);
    $stmt->execute();
    $commentsResult = $stmt->get_result();

} else {
    echo "No se proporcionó el ID del evento.";
    exit;
}

// Cerrar la conexión
$conn->close();
?>

<?php include'../includes/nav.php' ?>
<main class="contenedor">
    <h2 class="verde"><?php echo htmlspecialchars($evento['Descripcion_event']) ?></h2>
    <p>Fecha: <?php echo date('d/m/Y', strtotime($evento['event_date'])) ?> - Hora: <?php echo $evento['event_time'] ?></p>
    <p>Tipo de evento: <?php echo htmlspecialchars($evento['event_type']) ?></p>

    <h3 class="verde">Comentarios</h3>
    <ul class="event-list">
        <?php while ($comment = $commentsResult->fetch_assoc()): ?>
            <li>
                <p><?php echo htmlspecialchars($comment['comment']) ?></p>
            </li>
        <?php endwhile; ?>
    </ul>

    <!-- Formulario para agregar comentarios -->
    <form action="add_comment.php" method="post" class="contenedor">
        <label for="comment">Agregar comentario:</label>
        <textarea name="comment" id="comment" class="bordes"></textarea>
        <input type="submit" value="Enviar" class="btn-verde">
    </form>
</main>