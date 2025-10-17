CREATE DATABASE Empresa;
USE Empresa;

CREATE TABLE Chefe (
    id_chefe INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    data_inicio DATE
);

CREATE TABLE Departamento (
    id_departamento INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(10) UNIQUE,
    nome VARCHAR(100),
    sigla VARCHAR(10),
    id_chefe INT,
    FOREIGN KEY (id_chefe) REFERENCES Chefe(id_chefe)
);

CREATE TABLE Empregado (
    matricula INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100),
    sexo CHAR(1),
    telefone VARCHAR(20),
    data_admissao DATE,
    cargo VARCHAR(50),
    id_departamento INT,
    FOREIGN KEY (id_departamento) REFERENCES Departamento(id_departamento)
);

CREATE TABLE Dependente (
    id_dependente INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100),
    parentesco VARCHAR(50),
    matricula_empregado INT,
    FOREIGN KEY (matricula_empregado) REFERENCES Empregado(matricula)
);

CREATE TABLE Projeto (
    id_projeto INT PRIMARY KEY AUTO_INCREMENT,
    numero INT UNIQUE,
    nome VARCHAR(100),
    horas_previstas INT
);

CREATE TABLE Alocacao (
    matricula_empregado INT,
    id_projeto INT,
    data_alocacao DATE,
    PRIMARY KEY (matricula_empregado, id_projeto),
    FOREIGN KEY (matricula_empregado) REFERENCES Empregado(matricula),
    FOREIGN KEY (id_projeto) REFERENCES Projeto(id_projeto)
);
