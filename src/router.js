const express = require("express");
const {
    checarContas,
    criarConta,
    atualizarConta,
    deletarConta,
    depositar,
    sacar,
    transferir,
    verSaldo,
    verExtrato
} = require("./controladores/contas");

const router = express();

router.get("/contas", checarContas);

router.post("/contas", criarConta);

router.put("/contas/:numeroConta/usuario", atualizarConta);

router.delete("/contas/:numeroConta", deletarConta);

router.post("/transacoes/depositar", depositar);

router.post("/transacoes/sacar", sacar);

router.post("/transacoes/transferir", transferir);

router.get("/contas/saldo", verSaldo);

router.get("/contas/extrato", verExtrato);

module.exports = router;