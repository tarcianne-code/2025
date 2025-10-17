CREATE DATABASE Locadora;
USE Locadora;

CREATE TABLE Cliente (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    endereco VARCHAR(200),
    cpf CHAR(11) UNIQUE NOT NULL,
    telefone VARCHAR(20)
);

CREATE TABLE Veiculo (
    id_veiculo INT PRIMARY KEY AUTO_INCREMENT,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    descricao TEXT,
    cor VARCHAR(30),
    placa VARCHAR(10) UNIQUE
);

CREATE TABLE Contrato (
    id_contrato INT PRIMARY KEY AUTO_INCREMENT,
    data DATE,
    diaria DECIMAL(10,2),
    valor_seguro DECIMAL(10,2),
    id_cliente INT,
    id_veiculo INT,
    FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente),
    FOREIGN KEY (id_veiculo) REFERENCES Veiculo(id_veiculo)
);

CREATE TABLE Manutencao (
    id_manutencao INT PRIMARY KEY AUTO_INCREMENT,
    modelo VARCHAR(50),
    custo_mensal DECIMAL(10,2),
    id_veiculo INT,
    FOREIGN KEY (id_veiculo) REFERENCES Veiculo(id_veiculo)
);
