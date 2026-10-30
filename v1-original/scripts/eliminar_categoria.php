<?php
session_start();

include "conexion.php";

if(empty($_GET['id'])){
    header("location: lista_event_types.php");
} else {
    $id_event_type = $_GET['id'];
    if(!is_numeric($id_event_type)){
        header("location: lista_categoria.php");
    }

    $id_event_type = mysqli_real_escape_string($conection, $id_event_type);

    $query_event_type = mysqli_query($conection, "SELECT descripcion FROM event_type WHERE event_type = $id_event_type");
    $result_event_type = mysqli_num_rows($query_event_type);

    if($result_event_type > 0){
        $data_event_type = mysqli_fetch_assoc($query_event_type);
        $descripcion = $data_event_type['descripcion'];
    } else {
        header("location: lista_categoria.php");
    }
}

if(!empty($_POST)){
    $id_event_type = $_POST['id'];
    $id_event_type = mysqli_real_escape_string($conection, $id_event_type);

    $query_delete = mysqli_query($conection, "DELETE FROM event_type WHERE event_type = $id_event_type");

    if($query_delete){
        header("location: lista_categoria.php");
    } else {
        echo "Error al eliminar el tipo de evento";
    }
}

?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <?php include "../includes/scripts.php";?>
    <title>Eliminar Tipo de Evento</title>
</head>
<body>
    <?php include "../includes/header.php";?>
    <section id="container">
        <div class="data_delete">
            <h2>¿Está seguro de eliminar el siguiente tipo de evento?</h2>
            <p>Descripción del tipo de evento: <span><?php echo $descripcion;?></span></p>
            
            <form method="post" action="">
                <input type="hidden" name="id" value="<?php echo $id_event_type;?>">
                <a href="lista_categoria.php" class="btn_cancel">Cancelar</a>
                <input type="submit" value="Eliminar" class="btn_ok">
            </form>
        </div>
    </section>
</body>
</html>