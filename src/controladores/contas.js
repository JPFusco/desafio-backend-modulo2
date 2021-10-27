const dados = require("../bancodedados");
const { format } = require("date-fns");

let proxId = 1;

function mensagemErro(res, statusErro, mensagem) {
    return res.status(statusErro).json({
        mensagem: mensagem
    });
}

function cpfEmailUnico(cpf, email) {
    if (dados.contas.find(conta => (conta.usuario.cpf === cpf) || (conta.usuario.email === email))) {
        return false;
    }
    return true;
}

function contaValida(numeroConta) {
    if (!dados.contas.find(conta => conta.numero === numeroConta)) {
        return false;
    }
    return true;
}

function salvarTransacao(tipo, conta, valor, contaAlvo) {
    if (tipo === "depositos" || tipo === "saques") {
        dados[tipo].push({
            data: `${format(Date.now(), "yyyy-MM-dd HH:mm:ss")}`,
            numero_conta: conta,
            valor
        });
    } else {
        dados[tipo].push({
            data: `${format(Date.now(), "yyyy-MM-dd HH:mm:ss")}`,
            numero_conta_origem: conta,
            numero_conta_destino: contaAlvo,
            valor
        })
    }
}

function verificarSenha(index, senha) {
    if (dados.contas[index].usuario.senha !== senha) {
        return false;
    }
    return true;
}

function verificarSaldo(index, valor) {
    if (Number(valor) > Number(dados.contas[index].saldo)) {
        return false;
    }
    return true;
}

const checarContas = (req, res) => {
    const senha = req.query.senha_banco;
    if (!senha) {
        return mensagemErro(res, 400, "Necessário informar a senha do banco");
    }
    if (senha !== dados.banco.senha) {
        return mensagemErro(res, 401, "A senha do banco informada é inválida!");
    }
    return res.status(200).json(dados.contas);
}

const criarConta = (req, res) => {
    const { nome, cpf, data_nascimento, telefone, email, senha } = req.body;
    if (!nome || !cpf || !data_nascimento || !telefone || !email || !senha) {
        return mensagemErro(res, 400, "Todos os campos são obrigatórios!");
    }
    if (!cpfEmailUnico(cpf, email)) {
        return mensagemErro(res, 400, "Já existe uma conta com o CPF ou e-mail informado!");
    }

    dados.contas.push({
        numero: `${proxId++}`,
        saldo: "0",
        usuario: {
            nome,
            cpf,
            data_nascimento,
            telefone,
            email,
            senha
        }
    });
    return res.status(201).send();
}

const atualizarConta = (req, res) => {
    const numeroConta = req.params.numeroConta;
    const { nome, cpf, data_nascimento, telefone, email, senha } = req.body;
    if (!nome || !cpf || !data_nascimento || !telefone || !email || !senha) {
        return mensagemErro(res, 400, "Todos os campos são obrigatórios!");
    }
    if (!contaValida(numeroConta)) {
        return mensagemErro(res, 404, "Não existe uma conta com tal número!");
    }
    if (!cpfEmailUnico(cpf, email)) {
        return mensagemErro(res, 400, "Já existe uma conta com o CPF ou e-mail informado!");
    }
    const index = dados.contas.findIndex(conta => conta.numero === numeroConta);
    dados.contas[index].usuario = {
        nome,
        cpf,
        data_nascimento,
        telefone,
        email,
        senha
    }
    return res.status(201).send();
}

const deletarConta = (req, res) => {
    const numeroConta = req.params.numeroConta;
    if (!contaValida(numeroConta)) {
        return mensagemErro(res, 404, "Não existe uma conta com tal número!");
    }
    const index = dados.contas.findIndex(conta => conta.numero === numeroConta);
    if (dados.contas[index].saldo !== "0") {
        return mensagemErro(res, 400, "A conta só pode ser removida se o saldo for zero!");
    }
    dados.contas.splice(index, 1);
    return res.status(201).send();
}

const depositar = (req, res) => {
    const { numero_conta: numeroConta, valor } = req.body;
    if (!numeroConta || !valor) {
        return mensagemErro(res, 400, "O número da conta e o valor são obrigatórios!");
    }
    if (!contaValida(numeroConta)) {
        return mensagemErro(res, 404, "Não existe uma conta com tal número!");
    }
    if (Number(valor) <= 0) {
        return mensagemErro(res, 400, "O valor não pode ser menor que zero!");
    }
    const index = dados.contas.findIndex(conta => conta.numero === numeroConta);
    dados.contas[index].saldo = `${Number(dados.contas[index].saldo) + Number(valor)}`;
    salvarTransacao("depositos", numeroConta, valor); //here
    return res.status(201).send();
}

const sacar = (req, res) => {
    const { numero_conta: numeroConta, valor, senha } = req.body;
    if (!numeroConta || !valor || !senha) {
        return mensagemErro(res, 400, "O número da conta, o valor e a senha são obrigatórios!");
    }
    if (!contaValida) {
        return mensagemErro(res, 404, "Não existe uma conta com tal número!");
    }
    const index = dados.contas.findIndex(conta => conta.numero === numeroConta);
    if (!verificarSenha(index, senha)) {
        return mensagemErro(res, 401, "Senha inválida!");
    }
    if (!verificarSaldo(index, valor)) {
        return mensagemErro(res, 400, "Saldo insuficiente!");
    }
    dados.contas[index].saldo = `${Number(dados.contas[index].saldo) - Number(valor)}`;
    salvarTransacao("saques", numeroConta, valor);
    return res.status(201).send();
}

const transferir = (req, res) => {
    const { numero_conta_origem: numeroConta, numero_conta_destino: numeroContaAlvo, valor, senha } = req.body;
    if (!numeroConta || !numeroContaAlvo || !valor || !senha) {
        return mensagemErro(res, 400, "Todos os campos são obrigatórios!");
    }
    if (!contaValida(numeroConta)) {
        return mensagemErro(res, 404, "Conta de origem não existe!")
    }
    if (!contaValida(numeroContaAlvo)) {
        return mensagemErro(res, 404, "Conta de destino não existe!");
    }
    const index = dados.contas.findIndex(conta => conta.numero === numeroConta);
    if (!verificarSenha(index, senha)) {
        return mensagemErro(res, 401, "Senha inválida!");
    }
    if (!verificarSaldo(index, valor)) {
        return mensagemErro(res, 400, "Saldo insuficiente!");
    }
    dados.contas[index].saldo = `${Number(dados.contas[index].saldo) - Number(valor)}`;
    const indexContaAlvo = dados.contas.findIndex(conta => conta.numero === numeroContaAlvo);
    dados.contas[indexContaAlvo].saldo = `${Number(dados.contas[indexContaAlvo].saldo) + Number(valor)}`;
    salvarTransacao("transferencias", numeroConta, valor, numeroContaAlvo);
    return res.status(201).send();
}

const verSaldo = (req, res) => {
    const { numero_conta: numeroConta, senha } = req.query;
    if (!numeroConta || !senha) {
        return mensagemErro(res, 400, "Conta e senha obrigatórias!");
    }
    if (!contaValida(numeroConta)) {
        return mensagemErro(res, 404, "Não existe uma conta com tal número!");
    }
    const index = dados.contas.findIndex(conta => conta.numero === numeroConta);
    if (!verificarSenha(index, senha)) {
        return mensagemErro(res, 401, "Senha inválida!");
    }
    return res.status(200).json({
        saldo: `${dados.contas[index].saldo}`
    });
}

const verExtrato = (req, res) => {
    const { numero_conta: numeroConta, senha } = req.query;
    if (!numeroConta || !senha) {
        return mensagemErro(res, 400, "Conta e senha obrigatórias!");
    }
    if (!contaValida(numeroConta)) {
        return mensagemErro(res, 404, "Não existe uma conta com tal número!");
    }
    const index = dados.contas.findIndex(conta => conta.numero === numeroConta);
    if (!verificarSenha(index, senha)) {
        return mensagemErro(res, 401, "Senha inválida!");
    }
    const saques = dados.saques.filter(saque => saque.numero_conta === numeroConta);
    const depositos = dados.depositos.filter(deposito => deposito.numero_conta === numeroConta);
    const transferenciasEnviadas = dados.transferencias.filter(transferencia => transferencia.numero_conta_origem === numeroConta);
    const transferenciasRecebidas = dados.transferencias.filter(transferencia => transferencia.numero_conta_destino === numeroConta);
    return res.status(200).json({
        saques,
        depositos,
        transferenciasEnviadas,
        transferenciasRecebidas
    });
}

module.exports = {
    checarContas,
    criarConta,
    atualizarConta,
    deletarConta,
    depositar,
    sacar,
    transferir,
    verSaldo,
    verExtrato
}