CREATE DATABASE ClinicaVeterinaria;
USE ClinicaVeterinaria;

CREATE TABLE Cliente (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cpf CHAR(11) UNIQUE NOT NULL,
    endereco VARCHAR(200),
    telefone VARCHAR(20)
);

CREATE TABLE Animal (
    id_animal INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    especie VARCHAR(50),
    raca VARCHAR(50),
    id_cliente INT,
    FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente)
);

CREATE TABLE Enfermidade (
    id_enfermidade INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT
);

CREATE TABLE Veterinario (
    id_veterinario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100)
);

CREATE TABLE Atendimento (
    id_atendimento INT PRIMARY KEY AUTO_INCREMENT,
    id_animal INT,
    id_veterinario INT,
    data DATE,
    diagnostico TEXT,
    FOREIGN KEY (id_animal) REFERENCES Animal(id_animal),
    FOREIGN KEY (id_veterinario) REFERENCES Veterinario(id_veterinario)
);

CREATE TABLE Animal_Enfermidade (
    id_animal INT,
    id_enfermidade INT,
    PRIMARY KEY (id_animal, id_enfermidade),
    FOREIGN KEY (id_animal) REFERENCES Animal(id_animal),
    FOREIGN KEY (id_enfermidade) REFERENCES Enfermidade(id_enfermidade)
);
