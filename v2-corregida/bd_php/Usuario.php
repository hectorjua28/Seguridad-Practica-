<?php

class Usuario{
    private $id;
    private $nombre;
    private $email;
    private $pass;

    public function __construct($nombre, $email, $pass){
        $this->nombre = $nombre;
        $this->email = $email;
        $this->pass = $pass;
    }

    public function setId($id){
        $this->id = $id;
    }
    public function getId(){
        return $this->id;
    }

    public function setNombre($nombre){
        $this->nombre = $nombre;
    }
    public function getNombre(){
        return $this->nombre;
    }


    public function setEmail($email){
        $this->email = $email;
    }
    public function getEmail(){
        return $this->email;
    }

    public function setPass($pass){
        $this->pass = $pass;
    }
    public function getPass(){
        return $this->pass;
    }
}