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

			$Name_us = $_POST['Name_us'];
			$email_us  = $_POST['email_us'];
			$password_us  = md5($_POST['password_us']);


			$query = mysqli_query($conection,"SELECT * FROM users WHERE email_us = '$email_us' ");
			$result = mysqli_fetch_array($query);

			if($result > 0){
				$alert='<p class="msg_error">El correo electrónico ya existe.</p>';
			}else{

				$query_insert = mysqli_query($conection,"INSERT INTO users(Name_us,email_us,password_us)
															VALUES('$Name_us','$email_us','$password_us')");
				if($query_insert){
					$alert='<p class="msg_save">Usuario creado correctamente.</p>';
				}else{
					$alert='<p class="msg_error">Error al crear el usuario.</p>';
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
	<title>Registro Usuario</title>
</head>
<body>
	<?php include "../includes/header.php"; ?>
	<section id="container">
		
		<div class="form_register">
			<h1>Registro usuario</h1>
			<hr>
			<div class="alert"><?php echo isset($alert) ? $alert : ''; ?></div>

			<form action="" method="post">
				<label for="Name_us">Nombre</label>
				<input type="text" name="Name_us" id="Name_us" placeholder="Nombre completo">
				<label for="email_us">Correo electrónico</label>
				<input type="email" name="email_us" id="email_us" placeholder="Correo electrónico">
				<label for="password_us">Clave</label>
				<input type="password" name="password_us" id="password_us" placeholder="Clave de acceso">
				<input type="submit" value="Crear usuario" class="btn_save">

			</form>
		</div>
	</section>
</body>
</html>