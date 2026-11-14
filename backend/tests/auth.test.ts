import assert from "node:assert/strict";
import express from "express";
import supertest from "supertest";
import { after, before, beforeEach, describe, it } from "node:test";
import { authPaciente as exigirPaciente } from "../src/middlewares/auth";
import { errorHandler } from "../src/middlewares/errorHandler";
import { PerfilEquipe } from "../src/models";
import { api, authEquipe, authPaciente, clearDb, criarEquipe, criarPaciente, criarUbs, SENHA, startDb, stopDb } from "./helpers";

describe('autenticação (seção 6, "Entrar")', () => {
    before(startDb)
    beforeEach(clearDb)
    after(stopDb)

    it('equipe entra com e-mail e senha; erro não revela se o e-mail existe', async () => {
        const ubs = await criarUbs()
        const usuario = await criarEquipe(ubs.id, PerfilEquipe.RECEPCAO, { email: 'recepcao@ubs.local' })

        const ok = await api().post('/auth/equipe/entrar').send({ email: 'RECEPCAO@ubs.local', senha: SENHA })
        assert.equal(ok.status, 200)
        assert.ok(ok.body.token)
        assert.deepEqual(ok.body.usuario, { id: usuario.id, ubsId: ubs.id, nome: usuario.nome, email: 'recepcao@ubs.local', perfil: 'RECEPCAO' })
        assert.equal(ok.body.usuario.senhaHash, undefined)

        const senhaErrada = await api().post('/auth/equipe/entrar').send({ email: 'recepcao@ubs.local', senha: 'errada' })
        const emailInexistente = await api().post('/auth/equipe/entrar').send({ email: 'ninguem@ubs.local', senha: SENHA })
        assert.equal(senhaErrada.status, 401)
        assert.equal(senhaErrada.body.message, emailInexistente.body.message)
    })

    it('entrar: paciente usa CPF (com ou sem máscara) + senha', async () => {
        const ubs = await criarUbs()
        const paciente = await criarPaciente(ubs.id)
        const cpfComMascara = paciente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

        const res = await api().post('/auth/paciente/entrar').send({ cpf: cpfComMascara, senha: SENHA })

        assert.equal(res.status, 200)
        assert.equal(res.body.deveTrocarSenha, false)
        assert.equal(res.body.paciente.id, paciente.id)

        const errada = await api().post('/auth/paciente/entrar').send({ cpf: paciente.cpf, senha: 'errada' })
        assert.equal(errada.status, 401)
        assert.equal(errada.body.message, 'CPF ou senha inválidos')
    })

    it('senha provisória: com a troca pendente, só /auth/eu e a troca são liberados', async () => {
        const ubs = await criarUbs()
        const paciente = await criarPaciente(ubs.id, { deveTrocarSenha: true })

        // Rota qualquer protegida só para paciente
        const appTeste = express()
        appTeste.get('/protegida', exigirPaciente(), (_req, res) => { res.json({ ok: true }) })
        appTeste.use(errorHandler)

        const login = await api().post('/auth/paciente/entrar').send({ cpf: paciente.cpf, senha: SENHA })
        assert.equal(login.body.deveTrocarSenha, true)
        const auth = `Bearer ${login.body.token}`

        const bloqueada = await supertest(appTeste).get('/protegida').set('Authorization', auth)
        assert.equal(bloqueada.status, 403)
        assert.equal(bloqueada.body.message, 'Troque a senha provisória antes de continuar')

        const eu = await api().get('/auth/eu').set('Authorization', auth)
        assert.equal(eu.status, 200)

        const troca = await api().post('/auth/paciente/trocar-senha').set('Authorization', auth).send({ senhaAtual: SENHA, novaSenha: 'nova-senha' })
        assert.equal(troca.status, 200)
        assert.equal(troca.body.deveTrocarSenha, false)

        const liberada = await supertest(appTeste).get('/protegida').set('Authorization', `Bearer ${troca.body.token}`)
        assert.equal(liberada.status, 200)

        const antiga = await api().post('/auth/paciente/entrar').send({ cpf: paciente.cpf, senha: SENHA })
        assert.equal(antiga.status, 401)
        const nova = await api().post('/auth/paciente/entrar').send({ cpf: paciente.cpf, senha: 'nova-senha' })
        assert.equal(nova.body.deveTrocarSenha, false)
    })

    it('senha provisória: troca recusa senha atual errada e nova senha igual ou curta', async () => {
        const ubs = await criarUbs()
        const paciente = await criarPaciente(ubs.id, { deveTrocarSenha: true })
        const auth = authPaciente(paciente)

        const errada = await api().post('/auth/paciente/trocar-senha').set('Authorization', auth).send({ senhaAtual: 'xxx', novaSenha: 'nova-senha' })
        assert.equal(errada.status, 401)

        const igual = await api().post('/auth/paciente/trocar-senha').set('Authorization', auth).send({ senhaAtual: SENHA, novaSenha: SENHA })
        assert.equal(igual.status, 400)

        const curta = await api().post('/auth/paciente/trocar-senha').set('Authorization', auth).send({ senhaAtual: SENHA, novaSenha: '123' })
        assert.equal(curta.status, 400)
    })

    it('sessão: sem token 401, token inválido 401, paciente em rota de equipe 403', async () => {
        const ubs = await criarUbs()
        const paciente = await criarPaciente(ubs.id)

        assert.equal((await api().get('/auth/eu')).status, 401)
        assert.equal((await api().get('/auth/eu').set('Authorization', 'Bearer xxx')).status, 401)
        assert.equal((await api().get('/pacientes').set('Authorization', authPaciente(paciente))).status, 403)
    })

    it('/auth/eu devolve a equipe ou o paciente logado', async () => {
        const ubs = await criarUbs()
        const usuario = await criarEquipe(ubs.id, PerfilEquipe.ACS)

        const res = await api().get('/auth/eu').set('Authorization', authEquipe(usuario))

        assert.equal(res.body.tipo, 'EQUIPE')
        assert.equal(res.body.usuario.perfil, 'ACS')
    })
})
