<?php
session_start();

include "conexion.php";

if(empty($_GET['id'])){
    header("location: lista_usuarios.php");
} else {
    $id_usuario = $_GET['id'];
    if(!is_numeric($id_usuario)){
        header("location: lista_usuarios.php");
    }

    $id_usuario = mysqli_real_escape_string($conection, $id_usuario);

    $query_usuario = mysqli_query($conection, "SELECT Name_us, email_us FROM users WHERE ID_us = $id_usuario");
    $result_usuario = mysqli_num_rows($query_usuario);

    if($result_usuario > 0){
        $data_usuario = mysqli_fetch_assoc($query_usuario);
        $nombre = $data_usuario['Name_us'];
        $email = $data_usuario['email_us'];
    } else {
        header("location: lista_usuarios.php");
    }
}

if(!empty($_POST)){
    $id_usuario = $_POST['id'];
    $id_usuario = mysqli_real_escape_string($conection, $id_usuario);

    $query_delete = mysqli_query($conection, "DELETE FROM users WHERE ID_us = $id_usuario");

    if($query_delete){
        header("location: lista_usuarios.php");
    } else {
        echo "Error al eliminar el usuario";
    }
}

?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <?php include "../includes/scripts.php";?>
    <title>Eliminar Usuario</title>
</head>
<body>
    <?php include "../includes/header.php";?>
    <section id="container">
        <div class="data_delete">
            <h2>¿Está seguro de eliminar el siguiente registro?</h2>
            <p>Nombre del usuario: <span><?php echo $nombre;?></span></p>
            <p>Correo electrónico del usuario: <span><?php echo $email;?></span></p>
            
            <form method="post" action="">
                <input type="hidden" name="id" value="<?php echo $id_usuario;?>">
                <a href="lista_usuarios.php" class="btn_cancel">Cancelar</a>
                <input type="submit" value="Eliminar" class="btn_ok">
            </form>
        </div>
    </section>
</body>
</html>