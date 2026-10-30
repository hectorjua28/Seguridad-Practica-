<?php 

	require_once __DIR__ . '/../includes/auth.php';
require_admin(); // VULN-02: solo administradores
	
	include "conexion.php";

	if(!empty($_POST))
	{
		$alert='';
		if(empty($_POST['Name_us']) || empty($_POST['email_us']) || empty($_POST['password_us']))
		{
			$alert='<p class="msg_error">Todos los campos son obligatorios.</p>';
		}else{

			$Name_us = trim($_POST['Name_us']);
			$email_us = trim($_POST['email_us']);
			$password_us = password_hash($_POST['password_us'], PASSWORD_DEFAULT); // VULN-03: bcrypt con sal (antes md5)

			$st = $conection->prepare("SELECT 1 FROM users WHERE email_us = ?"); // VULN-01: consulta preparada
			$st->bind_param("s", $email_us);
			$st->execute();

			if($st->get_result()->num_rows > 0){
				$alert='<p class="msg_error">El correo electrónico ya existe.</p>';
			}else{
				$ins = $conection->prepare("INSERT INTO users(Name_us,email_us,password_us) VALUES(?,?,?)");
				$ins->bind_param("sss", $Name_us, $email_us, $password_us);
				if($ins->execute()){
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