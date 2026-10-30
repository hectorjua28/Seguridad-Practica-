<?php 

if (!isset($_SESSION)) {
    session_start();
}
 ?>
	<header>
		<div class="header">
			
			<h1>Sistema De Gestion de Eventos</h1>
			<div class="optionsBar">
				<p>Mexico, <?php echo fechaC(); ?></p>
				<span>|</span>
				<img class="photouser" src="../img/user.png" alt="Usuario">
				<a href="../scripts/cerrar_sesion.php"><img class="close" src="../img/salir.png" alt="Salir del sistema" title="Salir"></a>
			</div>
		</div>
		<?php include "nav2.php"; ?>
	</header>