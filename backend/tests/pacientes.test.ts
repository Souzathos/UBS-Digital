import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { Paciente, PerfilEquipe } from "../src/models";
import { ConfiguracaoService } from "../src/services/ConfiguracaoService";
import { cpfComDigitos } from "../src/utils/cpf";
import { api, authEquipe, authPaciente, clearDb, congelarEm, criarEquipe, criarPaciente, criarProfissional, criarRua, criarUbs, semearConfiguracao, startDb, stopDb, zerarRelogio } from "./helpers";

const novoPaciente = (dados: Record<string, unknown> = {}) => ({
    nome: 'Joana Teste',
    cpf: cpfComDigitos('987654321'),
    dataNascimento: '1970-05-10',
    numero: '210',
    telefone: '(51) 99999-0000',
    possuiCelular: true,
    consentimentoCanais: ['WHATSAPP', 'SMS'],
    ...dados
})

describe('pacientes no painel da UBS', () => {
    before(startDb)
    beforeEach(async () => {
        await clearDb()
        await semearConfiguracao()
        congelarEm('2026-11-16T10:00:00')
    })
    afterEach(zerarRelogio)
    after(stopDb)

    it('senha provisória: recepção cadastra e recebe a senha provisória uma única vez', async () => {
        const ubs = await criarUbs()
        const rua = await criarRua(ubs.id, (await criarProfissional(ubs.id, { nome: 'Dra. Helena' })).id, 'Rua das Flores')
        const recepcao = await criarEquipe(ubs.id, PerfilEquipe.RECEPCAO)

        const res = await api().post('/pacientes').set('Authorization', authEquipe(recepcao)).send(novoPaciente({ ruaId: rua.id }))

        assert.equal(res.status, 201)
        assert.match(res.body.senhaProvisoria, /^\d{6}$/)
        assert.equal(res.body.paciente.deveTrocarSenha, true)
        assert.equal(res.body.paciente.telefone, '51999990000')
        assert.equal(res.body.paciente.ubsId, ubs.id)
        assert.deepEqual(res.body.paciente.rua, { id: rua.id, nome: 'Rua das Flores' })
        assert.equal(res.body.paciente.medicoReferencia.nome, 'Dra. Helena')

        // RN-80: consentimento por canal com data
        assert.deepEqual(res.body.paciente.consentimentoCanais.WHATSAPP, { aceito: true, em: new Date('2026-11-16T10:00:00').toISOString() })

        const login = await api().post('/auth/paciente/entrar').send({ cpf: novoPaciente({ ruaId: rua.id }).cpf, senha: res.body.senhaProvisoria })
        assert.equal(login.status, 200)
        assert.equal(login.body.deveTrocarSenha, true)

        const obter = await api().get(`/pacientes/${res.body.paciente.id}`).set('Authorization', authEquipe(recepcao))
        assert.equal(obter.body.senhaProvisoria, undefined)
    })

    it('seção 7: pontuação inicial do paciente vem da configuração da UBS', async () => {
        const ubs = await criarUbs()
        const rua = await criarRua(ubs.id, (await criarProfissional(ubs.id, { nome: 'Dra. Helena' })).id, 'Rua das Flores')
        const recepcao = await criarEquipe(ubs.id, PerfilEquipe.RECEPCAO)
        await new ConfiguracaoService().set('pontos.inicial', 90, ubs.id)

        const res = await api().post('/pacientes').set('Authorization', authEquipe(recepcao)).send(novoPaciente({ ruaId: rua.id }))

        assert.equal(res.body.paciente.pontuacao, 90)
    })

    it('perfil: ACS não cadastra paciente; CPF inválido 400; CPF repetido 409', async () => {
        const ubs = await criarUbs()
        const rua = await criarRua(ubs.id, (await criarProfissional(ubs.id, { nome: 'Dra. Helena' })).id, 'Rua das Flores')
        const acs = await criarEquipe(ubs.id, PerfilEquipe.ACS)
        const gestor = await criarEquipe(ubs.id, PerfilEquipe.GESTOR)

        assert.equal((await api().post('/pacientes').set('Authorization', authEquipe(acs)).send(novoPaciente({ ruaId: rua.id }))).status, 403)
        assert.equal((await api().post('/pacientes').set('Authorization', authEquipe(gestor)).send(novoPaciente({ cpf: '11111111111', ruaId: rua.id }))).status, 400)
        assert.equal((await api().post('/pacientes').set('Authorization', authEquipe(gestor)).send(novoPaciente({ ruaId: rua.id }))).status, 201)
        assert.equal((await api().post('/pacientes').set('Authorization', authEquipe(gestor)).send(novoPaciente({ ruaId: rua.id }))).status, 409)
    })

    it('busca por nome ou CPF, só dentro da UBS da equipe', async () => {
        const ubs = await criarUbs('UBS A')
        const outra = await criarUbs('UBS B')
        const acs = await criarEquipe(ubs.id, PerfilEquipe.ACS)
        const maria = await criarPaciente(ubs.id, { nome: 'Maria das Dores' })
        await criarPaciente(ubs.id, { nome: 'José Silva' })
        await criarPaciente(outra.id, { nome: 'Maria de Outra UBS' })

        const porNome = await api().get('/pacientes?q=maria').set('Authorization', authEquipe(acs))
        assert.deepEqual(porNome.body.map((p: any) => p.nome), ['Maria das Dores'])

        const porCpf = await api().get(`/pacientes?q=${maria.cpf.slice(0, 9)}`).set('Authorization', authEquipe(acs))
        assert.deepEqual(porCpf.body.map((p: any) => p.id), [maria.id])

        const todos = await api().get('/pacientes').set('Authorization', authEquipe(acs))
        assert.equal(todos.body.length, 2)

        const deOutraUbs = await api().get(`/pacientes/${(await AppDataSource.getRepository(Paciente).findOneBy({ ubsId: outra.id }))!.id}`).set('Authorization', authEquipe(acs))
        assert.equal(deOutraUbs.status, 404)
    })

    it('RN-52: o selo de vulnerável aparece para a equipe e nunca para o paciente', async () => {
        const ubs = await criarUbs()
        const recepcao = await criarEquipe(ubs.id, PerfilEquipe.RECEPCAO)
        const paciente = await criarPaciente(ubs.id, { vulneravel: true })

        const equipe = await api().get(`/pacientes/${paciente.id}`).set('Authorization', authEquipe(recepcao))
        assert.equal(equipe.body.vulneravel, true)

        const login = await api().post('/auth/paciente/entrar').send({ cpf: paciente.cpf, senha: '123456' })
        const eu = await api().get('/auth/eu').set('Authorization', authPaciente(paciente))
        for(const corpo of [login.body, eu.body]) {
            assert.doesNotMatch(JSON.stringify(corpo), /vulneravel|pontuacao|senhaHash/)
        }
    })

    it('senha provisória: recepção redefine e o paciente volta a ter troca obrigatória', async () => {
        const ubs = await criarUbs()
        const recepcao = await criarEquipe(ubs.id, PerfilEquipe.RECEPCAO)
        const paciente = await criarPaciente(ubs.id)

        const res = await api().post(`/pacientes/${paciente.id}/redefinir-senha`).set('Authorization', authEquipe(recepcao))

        assert.equal(res.status, 200)
        const login = await api().post('/auth/paciente/entrar').send({ cpf: paciente.cpf, senha: res.body.senhaProvisoria })
        assert.equal(login.body.deveTrocarSenha, true)
    })
})
