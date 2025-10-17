CREATE DATABASE Comercial;
USE Comercial;

CREATE TABLE Cliente (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) UNIQUE,
    nome VARCHAR(100),
    endereco VARCHAR(200)
);

CREATE TABLE Produto (
    id_produto INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) UNIQUE,
    nome VARCHAR(100),
    custo DECIMAL(10,2),
    preco DECIMAL(10,2),
    familia VARCHAR(50)
);

CREATE TABLE PedidoVenda (
    id_pedido INT PRIMARY KEY AUTO_INCREMENT,
    numero VARCHAR(20) UNIQUE,
    data DATE,
    id_cliente INT,
    FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente)
);

CREATE TABLE ItemPedido (
    id_pedido INT,
    id_produto INT,
    quantidade INT,
    preco_unitario DECIMAL(10,2),
    PRIMARY KEY (id_pedido, id_produto),
    FOREIGN KEY (id_pedido) REFERENCES PedidoVenda(id_pedido),
    FOREIGN KEY (id_produto) REFERENCES Produto(id_produto)
);

CREATE TABLE Transportadora (
    id_transportadora INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100),
    cnpj CHAR(14) UNIQUE
);

CREATE TABLE Fatura (
    id_fatura INT PRIMARY KEY AUTO_INCREMENT,
    numero VARCHAR(20) UNIQUE,
    data DATE,
    id_pedido INT,
    id_transportadora INT,
    FOREIGN KEY (id_pedido) REFERENCES PedidoVenda(id_pedido),
    FOREIGN KEY (id_transportadora) REFERENCES Transportadora(id_transportadora)
);

CREATE TABLE Duplicata (
    id_duplicata INT PRIMARY KEY AUTO_INCREMENT,
    numero VARCHAR(20) UNIQUE,
    vencimento DATE,
    id_cliente INT,
    id_fatura INT,
    portador VARCHAR(50),
    FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente),
    FOREIGN KEY (id_fatura) REFERENCES Fatura(id_fatura)
);
