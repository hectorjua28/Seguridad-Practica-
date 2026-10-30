<?php 
    session_start();

    include "conexion.php";   
?>


<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <?php include "../includes/scripts.php";?>
    <title>Lista de usuarios</title>
</head>
<body>
    <?php include "../includes/header.php";?>
    <section id="container">
        
        <h1>Lista de usuarios</h1>
        <a href="registro_usuario.php" class="btn_new">Crear usuario</a>
        
        

        <table>
            <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo electrónico</th>
                <th>Acciones</th>
            </tr>
        <?php 
            //Paginador
            $sql_registe = mysqli_query($conection,"SELECT COUNT(*) as total_registro FROM users");
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

            $query = mysqli_query($conection,"SELECT * FROM users ORDER BY ID_us ASC LIMIT $desde,$por_pagina");

            $result = mysqli_num_rows($query);
            if($result > 0){
                while ($data = mysqli_fetch_array($query)) {
                    ?>
                    <tr>
                        <td><?php echo $data["ID_us"];?></td>
                        <td><?php echo $data["Name_us"];?></td>
                        <td><?php echo $data["email_us"];?></td>
                        <td>
                            <a class="link_update" href="editar_usuario.php?id=<?php echo $data["ID_us"];?>">Editar</a>
                            |
                            <?php if ($data["ID_us"] != 1) { ?>
                                <a class="link_delete" href="eliminar_usuario.php?id=<?php echo $data["ID_us"];?>">Eliminar</a>
                            <?php } else { ?>
                            <?php } ?>
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