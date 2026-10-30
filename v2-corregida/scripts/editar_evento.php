<?php
require_once __DIR__ . '/../includes/auth.php';
require_admin(); // VULN-02: solo administradores

if (!isset($_SESSION['correo'])) {
  // Si no hay sesión activa, redirigir a la página de login
  header("Location: ../paginas/login.php");
  exit;
}

// Conexión a la base de datos
require_once __DIR__ . '/../includes/db.php';
$conn = db();

// Verificar conexión
if ($conn->connect_error) {
  die("Error de conexión: " . $conn->connect_error);
}

// Consulta para obtener los tipos de eventos
$query_event_type = mysqli_query($conn, "SELECT event_type, descripcion FROM event_type ORDER BY descripcion ASC");
$result_event_type = mysqli_num_rows($query_event_type);

// Verificar si el formulario se ha enviado
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  // Recibir datos del formulario
  $titulo = $_POST['titulo'];
  $descripcion = $_POST['descripcion'];
  $fecha = $_POST['fecha'];
  $hora = $_POST['hora'];
  $foto = $_FILES['foto'];
  $tipo = $_POST['event_type'];
  $id_evento = $_POST['id'];

  // Verificar si los campos están vacíos
  if (empty($titulo) || empty($descripcion) || empty($fecha) || empty($hora) || empty($tipo) ) {
    echo "Error: Campos vacíos";
    exit;
  }

  // Verificar si la foto es válida
  if ($foto['error'] !== 0) {
    $alert='<p class="msg_save">Agregar foto!!!.</p>';
    exit;
  }

  // Mover la foto a una carpeta temporal
  // VULN-04: validar que sea imagen real y guardar con nombre aleatorio
  require_once __DIR__ . '/../includes/upload.php';
  $rutaDestino = guardar_foto_evento($foto);
  if ($rutaDestino === null) {
    http_response_code(400);
    echo "Error: archivo de imagen no válido";
    exit;
  }

  // Actualizar datos en la base de datos
  $sql = "UPDATE events SET Titulo = ?, Descripcion_event = ?, event_date = ?, event_time = ?, photo = ?, event_type = ? WHERE ID_event = ?";
  $stmt = $conn->prepare($sql);
  $stmt->bind_param("ssssssi", $titulo, $descripcion, $fecha, $hora, $rutaDestino, $tipo, $id_evento);
  $stmt->execute();

  if ($stmt->affected_rows === 1) {
    $alert='<p class="msg_save">Evento editado con éxito.</p>';  
    } else {
        $alert='<p class="msg_save">Error al editar el evento.</p>';
  }
}

// Mostrar datos del evento
if (isset($_GET['id'])) {
  $id_evento = $_GET['id'];
  $sql = "SELECT * FROM events WHERE id_event = ?";
  $stmt = $conn->prepare($sql);
  $stmt->bind_param("i", $id_evento);
  $stmt->execute();
  $result = $stmt->get_result();
  $data = $result->fetch_assoc();

  $titulo = $data['Titulo'];
  $descripcion = $data['Descripcion_event'];
  $fecha = $data['event_date'];
  $hora = $data['event_time'];
  $foto = $data['photo'];
  $tipo = $data['event_type'];
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<?php include "../includes/scripts.php"; ?>
	<title>Editar Evento</title>
</head>
<body>
	<?php include "../includes/header.php"; ?>
	<section id="container">
		
		<div class="form_register">
			<h1>Editar evento</h1>
			<hr>
			<div class="alert"><?php echo isset($alert) ? $alert : ''; ?></div>

			<!-- Mostrar campo Titulo solo en la parte superior del formulario -->
			

			<form action="" method="post" enctype="multipart/form-data">
				<input type="hidden" name="id" value="<?php echo $id_evento;?>">
                <label for="titulo">Título del evento</label>
			    <input type="text" name="titulo" id="titulo" placeholder="Título del evento" value="<?php echo $titulo;?>">
				<label for="descripcion">Descripción del evento</label>
				<input type="text" name="descripcion" id="descripcion" placeholder="Descripción del evento" value="<?php echo $descripcion;?>">
				<label for="fecha">Fecha del evento</label>
				<input type="date" name="fecha" id="fecha" placeholder="Fecha del evento" value="<?php echo $fecha;?>">
                <label for="hora">Hora del evento</label>
				<input type="time" name="hora" id="hora" placeholder="Hora del evento" value="<?php echo $hora;?>">
				<label for="event_type">Tipo de evento</label>
				<select name="event_type" id="event_type">
					<?php
						if($result_event_type > 0){
							while ($event_type = mysqli_fetch_array($query_event_type)){
					?>
								<option value="<?php echo $event_type['event_type']; ?>" <?php if($event_type['event_type'] == $tipo) echo "selected"; ?>><?php echo $event_type['descripcion']; ?></option>
					<?php
							}
						}
					?>
				</select>
				<label for="foto">Foto del evento</label>
				<input type="file" name="foto" id="foto">
				<input type="submit" value="Guardar cambios" class="btn_save">

			</form>


		</div>


	</section>
</body>
</html>

<?php
// Cerrar conexión
$conn->close();
?>