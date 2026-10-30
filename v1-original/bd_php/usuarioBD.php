<?php

error_reporting(E_ALL);
ini_set("display_errors",1);

require_once("conexion.php");
require_once("Usuario.php");

error_reporting(~E_NOTICE);
mysqli_report(MYSQLI_REPORT_ALL & ~MYSQLI_REPORT_INDEX);
mysqli_report(MYSQLI_REPORT_STRICT);

class UsuarioBD{
    private $insertar_sql = "INSERT INTO users(Name_us, email_us, password_us) VALUES (?,?,?)";
    private $login = "SELECT*FROM users WHERE email_us=?";
    private $coon;

    public function __construct(){
        $c = new Conexion();
        $this->coon = $c->conectar();
    }

    public function crear($usuario){
        try{
            $hashed_password = password_hash($usuario->getPassword(), PASSWORD_BCRYPT);
            $sentencia = $this->coon->prepare($this->insertar_sql);
            $sentencia->bind_param("sss", $usuario->getNombre(), $usuario->getEmail(), $hashed_password);
            $resultado = $sentencia->execute();
            if($resultado == 1){
                return "Usuario creado";
            } else{
                return "No se pudo crear el usuario";
            }
        }catch(mysqli_sql_exception $e) {
            echo"Error al insertar". $e->getMessage();
        }
        finally{
            $this->coon->close();
        }
    }

    public function login($email, $pass){
        $usuario=null;
        try{
            $sentencia = $this ->coon->prepare($this->login);
            $sentencia->bind_param("s", $email);
            $sentencia -> execute();
            $resultado = $sentencia->get_result();
            if($resultado->num_rows >= 1){
                while($fila=mysqli_fetch_assoc($resultado)){
                    $usuario= new Usuario($fila['Name_us'] ,$fila['email_us'], $fila['password_us']);
                    $usuario->setId($fila['ID_us']);
                    $usuario->setNombre($fila['Name_us']);
                    $usuario->setEmail($fila['email_us']);
                    $usuario->setPass($fila['password_us']);
                }
                // Verificamos la contraseña aquí
                if(password_verify($pass, $usuario->getPass())){
                    return $usuario;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }catch(mysqli_sql_exception $e) {
            echo"Error al logearte". $e->getMessage();
        }
        finally{
            $this->coon->close();
        } 
    }

}