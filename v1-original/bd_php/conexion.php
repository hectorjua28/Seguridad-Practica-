<?php 

    class Conexion{
        public $conn;

        public function __construct(){

        }

        public function conectar(){
            $this->conn = new mysqli("localhost","root","","totoninin");
            if($this->conn->connect_errno){
                //echo"conexion fallida".$this->conn->connect_error;
            }
            else {
                //echo"Conexion realizada!!";
            }
        return $this->conn;
        }
    }