<?php 

	session_start();
	
	include "conexion.php";

	if(!empty($_POST))
	{
		$alert='';
		if(empty($_POST['descripcion']))
		{
			$alert='<p class="msg_error">La descripción es obligatoria.</p>';
		}else{

			$descripcion = $_POST['descripcion'];


			$query = mysqli_query($conection,"SELECT * FROM event_type WHERE descripcion = '$descripcion' ");
			$result = mysqli_fetch_array($query);

			if($result > 0){
				$alert='<p class="msg_error">El tipo de evento ya existe.</p>';
			}else{

				$query_insert = mysqli_query($conection,"INSERT INTO event_type(descripcion)
															VALUES('$descripcion')");
				if($query_insert){
					$alert='<p class="msg_save">Tipo de evento creado correctamente.</p>';
				}else{
					$alert='<p class="msg_error">Error al crear el tipo de evento.</p>';
				}

			}


		}

	}



 ?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<?php include "../includes/scripts.php"; ?>
	<title>Registro Tipo de Evento</title>
</head>
<body>
	<?php include "../includes/header.php"; ?>
	<section id="container">
		
		<div class="form_register">
			<h1>Registro Tipo de Evento</h1>
			<hr>
			<div class="alert"><?php echo isset($alert) ? $alert : ''; ?></div>

			<form action="" method="post">
				<label for="descripcion">Descripción del tipo de evento</label>
				<input type="text" name="descripcion" id="descripcion" placeholder="Descripción del tipo de evento">
				<input type="submit" value="Crear tipo de evento" class="btn_save">

			</form>
		</div>
	</section>
</body>
</html>