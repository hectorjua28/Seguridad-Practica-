<?php 
    session_start();

    include "conexion.php";   
?>


<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <?php include "../includes/scripts.php";?>
    <title>Lista de categorías</title>
</head>
<body>
    <?php include "../includes/header.php";?>
    <section id="container">
        
        <h1>Lista de categorías</h1>
        <a href="registro_categoria.php" class="btn_new">Crear categoría</a>
        
        

        <table>
            <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Acciones</th>
            </tr>
        <?php 
            //Paginador
            $sql_registe = mysqli_query($conection,"SELECT COUNT(*) as total_registro FROM event_type");
            $result_register = mysqli_fetch_array($sql_registe);
            $total_registro = $result_register['total_registro'];

            $por_pagina = 5;

            if(empty($_GET['pagina']))
            {
                $pagina = 1;
            }else{
                $pagina = $_GET['pagina'];
            }

            $desde = ($pagina-1) * $por_pagina;
            $total_paginas = ceil($total_registro / $por_pagina);

            $query = mysqli_query($conection,"SELECT * FROM event_type ORDER BY event_type ASC LIMIT $desde,$por_pagina");

            $result = mysqli_num_rows($query);
            if($result > 0){
                while ($data = mysqli_fetch_array($query)) {
                    ?>
                    <tr>
                        <td><?php echo $data["event_type"];?></td>
                        <td><?php echo $data["Descripcion"];?></td>
                        <td>
                            <a class="link_update" href="editar_categoria.php?id=<?php echo $data["event_type"];?>">Editar</a>
                            |
                            <a class="link_delete" href="eliminar_categoria.php?id=<?php echo $data["event_type"];?>">Eliminar</a>
                        </td>
                    </tr>
                <?php 
                }
            }
      ?>


        </table>
        <div class="paginador">
            <ul>
            <?php 
                if($pagina!= 1)
                {
              ?>
                <li><a href="?pagina=<?php echo 1;?>">|<</a></li>
                <li><a href="?pagina=<?php echo $pagina-1;?>"><<</a></li>
            <?php 
                }
                for ($i=1; $i <= $total_paginas; $i++) { 
                    # code...
                    if($i == $pagina)
                    {
                        echo '<li class="pageSelected">'.$i.'</li>';
                    }else{
                        echo '<li><a href="?pagina='.$i.'">'.$i.'</a></li>';
                    }
                }

                if($pagina!= $total_paginas)
                {
              ?>
                <li><a href="?pagina=<?php echo $pagina + 1;?>">>></a></li>
                <li><a href="?pagina=<?php echo $total_paginas;?> ">>|</a></li>
            <?php }?>
            </ul>
        </div>


    </section>
</body>
</html>

<?php 
    mysqli_close($conection);
?>