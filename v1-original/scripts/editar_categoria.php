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

			$id_event_type = $_POST['id'];
			$descripcion  = $_POST['descripcion'];

			$query = mysqli_query($conection,"SELECT * FROM event_type 
													   WHERE descripcion = '$descripcion' AND event_type != $id_event_type");

			if (!$query) {
				die("Error al ejecutar la consulta: ". mysqli_error($conection));
			}

			$result = mysqli_num_rows($query);

			if($result > 0){
				$alert='<p class="msg_error">La descripción ya existe.</p>';
			}else{

				$sql_update = mysqli_query($conection,"UPDATE event_type
															SET descripcion = '$descripcion'
															WHERE event_type = $id_event_type ");

				if($sql_update){
					$alert='<p class="msg_save">Tipo de evento actualizado correctamente.</p>';
				}else{
					$alert='<p class="msg_error">Error al actualizar el tipo de evento.</p>';
				}

			}


		}


	}

	//Mostrar Datos
	if(empty($_REQUEST['id']))
	{
		header('Location: lista_categoria.php');
		mysqli_close($conection);
	}
	$id_event_type = $_REQUEST['id'];

	$sql= mysqli_query($conection,"SELECT * FROM event_type WHERE event_type = $id_event_type");
	mysqli_close($conection);
	$result_sql = mysqli_num_rows($sql);

	if($result_sql == 0){
		header('Location: lista_categoria.php');
	}else{
		while ($data = mysqli_fetch_array($sql)) {
			# code...
			$id_event_type  = $data['event_type'];
			$descripcion  = $data['Descripcion'];

		}
	}

?>

<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<?php include "../includes/scripts.php";?>
	<title>Actualizar Tipo de Evento</title>
</head>
<body>
	<?php include "../includes/header.php";?>
	<section id="container">
		
		<div class="form_register">
			<h1>Actualizar tipo de evento</h1>
			<hr>
			<div class="alert"><?php echo isset($alert)? $alert : '';?></div>

			<form action="" method="post">
				<input type="hidden" name="id" value="<?php echo $id_event_type;?>">
				<label for="descripcion">Descripción</label>
				<input type="text" name="descripcion" id="descripcion" placeholder="Descripción del tipo de evento" value="<?php echo $descripcion;?>">
				<input type="submit" value="Actualizar tipo de evento" class="btn_save">

			</form>


		</div>


	</section>
</body>
</html>