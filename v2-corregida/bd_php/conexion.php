<?php 

    class Conexion{
        public $conn;

        public function __construct(){

        }

        public function conectar(){
            require_once __DIR__ . '/../includes/db.php';
            $this->conn = db();
            if($this->conn->connect_errno){
                //echo"conexion fallida".$this->conn->connect_error;
            }
            else {
                //echo"Conexion realizada!!";
            }
        return $this->conn;
        }
    }