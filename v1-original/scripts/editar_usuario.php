<?php 
	session_start();

	include "conexion.php";

	if(!empty($_POST))
	{
		$alert='';
		if(empty($_POST['Name_us']) || empty($_POST['email_us']) || empty($_POST['password_us']))
		{
			$alert='<p class="msg_error">Todos los campos son obligatorios.</p>';
		}else{

			$idUser = $_POST['id'];
			$Name_us = $_POST['Name_us'];
			$email_us  = $_POST['email_us'];
			$password_us  = password_hash($_POST['password_us'], PASSWORD_DEFAULT);

			$query = mysqli_query($conection,"SELECT * FROM users 
													   WHERE (email_us = '$email_us' AND id_us!= $idUser)
													   OR (email_us = '$email_us' AND id_us!= $idUser) ");

			if (!$query) {
				die("Error al ejecutar la consulta: ". mysqli_error($conection));
			}

			$result = mysqli_num_rows($query);

			if($result > 0){
				$alert='<p class="msg_error">El correo electrónico ya existe.</p>';
			}else{

				if(empty($_POST['password_us']))
				{

					$sql_update = mysqli_query($conection,"UPDATE users
															SET Name_us = '$Name_us', email_us='$email_us'
															WHERE ID_us= $idUser ");
				}else{
					$sql_update = mysqli_query($conection,"UPDATE users
															SET Name_us = '$Name_us', email_us='$email_us', password_us='$password_us'
															WHERE ID_us= $idUser ");

				}

				if($sql_update){
					$alert='<p class="msg_save">Usuario actualizado correctamente.</p>';
				}else{
					$alert='<p class="msg_error">Error al actualizar el usuario.</p>';
				}

			}


		}


	}

	//Mostrar Datos
	if(empty($_REQUEST['id']))
	{
		header('Location: lista_usuarios.php');
		mysqli_close($conection);
	}
	$idUser = $_REQUEST['id'];

	$sql= mysqli_query($conection,"SELECT * FROM users WHERE ID_us= $idUser");
	mysqli_close($conection);
	$result_sql = mysqli_num_rows($sql);

	if($result_sql == 0){
		header('Location: lista_usuarios.php');
	}else{
		while ($data = mysqli_fetch_array($sql)) {
			# code...
			$idUser  = $data['ID_us'];
			$Name_us  = $data['Name_us'];
			$email_us  = $data['email_us'];
			$password_us  = $data['password_us'];

		}
	}

?>

<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<?php include "../includes/scripts.php";?>
	<title>Actualizar Usuario</title>
</head>
<body>
	<?php include "../includes/header.php";?>
	<section id="container">
		
		<div class="form_register">
			<h1>Actualizar usuario</h1>
			<hr>
			<div class="alert"><?php echo isset($alert)? $alert : '';?></div>

			<form action="" method="post">
				<input type="hidden" name="id" value="<?php echo $idUser;?>">
				<label for="Name_us">Nombre</label>
				<input type="text" name="Name_us" id="Name_us" placeholder="Nombre completo" value="<?php echo $Name_us;?>">
				<label for="email_us">Correo electrónico</label>
				<input type="email" name="email_us" id="email_us" placeholder="Correo electrónico" value="<?php echo $email_us;?>">
				<label for="password_us">Clave</label>
				<input type="password" name="password_us" id="password_us" placeholder="Clave de acceso">
				<input type="submit" value="Actualizar usuario" class="btn_save">

			</form>


		</div>


	</section>
</body>
</html>