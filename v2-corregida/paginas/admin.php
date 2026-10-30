<?php 
	require_once __DIR__ . '/../includes/auth.php';
require_admin(); // VULN-02: solo administradores

    if (!isset($_SESSION['correo'])) {
        // Si no hay sesión activa, redirigir a la página de login
        header("Location: login.php");
        exit;
    }

    // Conectar a la base de datos
    include "../scripts/conexion.php";

    // Consultar los eventos de la base de datos
    $sql = "SELECT * FROM events";
    $result = mysqli_query($conection, $sql);

    // Verificar si hay eventos en la base de datos
    if (mysqli_num_rows($result) > 0) {
        $events = array();
        while ($row = mysqli_fetch_assoc($result)) {
            $events[] = $row;
        }
    } else {
        $events = array();
    }

    // Cerrar la conexión a la base de datos
    mysqli_close($conection);
 ?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<?php include "../includes/scripts.php"; ?>
	<title>Sistema - Administrador</title>
	<link rel="stylesheet" href="../css/calendario.css">
</head>
<body>
	<?php include "../includes/header.php"; ?>
	<section id="container">
		<div class="content">
			<h1>Bienvenido al sistema de administrador</h1>
			<p>Aquí puedes administrar todos los aspectos del sistema de eventos.</p>
			<h2>Eventos</h2>
			<ul class="event-list">
				<?php foreach ($events as $event) { ?>
					<div class="event">
        				<img src="<?php echo $event['photo']; ?>" alt="<?php echo htmlspecialchars($evento['Descripcion_event']) ?>">
        				<h3><?php echo htmlspecialchars($event['Descripcion_event']) ?></h3>
        				<p>Fecha: <?php echo date('d/m/Y', strtotime($event['event_date'])) ?> </>
        				<p>Hora: <?php echo $event['event_time'] ?></p>
        				<p>Tipo de evento: <?php echo htmlspecialchars($event['event_type']) ?></>
        				<a href="../scripts/evento_detalle.php?ID_event=<?php echo $event['ID_event']; ?>">ver más</a>
    				</div>
				<?php } ?>
			</ul>
		</div>
	</section>
</body>
</html>