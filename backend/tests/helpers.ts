import supertest from "supertest";
import app from "../src/app";
import { AppDataSource } from "../src/config/dataSource";
import { CONFIGURACAO_PADRAO } from "../src/seeds/dados/configuracao";
import { CategoriaAtendimento, Configuracao, OrigemSlot, Rua, Paciente, PerfilEquipe, Profissional, Slot, StatusSlot, TipoAtendimento, Ubs, UsuarioEquipe } from "../src/models";
import { cpfComDigitos } from "../src/utils/cpf";
import { gerarHash } from "../src/utils/hash";
import { gerarToken } from "../src/utils/jwt";
import { relogioAjustavel } from "../src/clock";
import { TipoAutor } from "../src/models";

export const api = () => supertest(app)

export async function startDb() {
    // Confere a conexão real: os testes apagam todas as tabelas
    if(!String(AppDataSource.options.database).endsWith('_test')) {
        throw new Error('Os testes só rodam em bancos com nome terminado em _test')
    }

    if(!AppDataSource.isInitialized) await AppDataSource.initialize()
}

export async function clearDb() {
    ruaPadraoId = null
    const tables = AppDataSource.entityMetadatas.map(entity => `"${entity.tableName}"`)
    if(tables.length === 0) return

    await AppDataSource.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`)
}

export async function stopDb() {
    if(AppDataSource.isInitialized) await AppDataSource.destroy()
}

// ---- Fábricas: gravam direto no banco, sem passar pelas regras dos services ----

export const SENHA = '123456'
let sequencia = 0
// Rua usada por criarPaciente quando o teste não informa outra. O montarCenario define a rua do médico
// do cenário, para os pacientes criados nele poderem marcar consulta médica (regra do médico pela rua).
let ruaPadraoId: number | null = null

// CPF válido e diferente a cada chamada
export function cpfValidoUnico() {
    sequencia += 1
    return cpfComDigitos(String(100000000 + sequencia))
}

export async function criarUbs(nome = 'UBS Teste') {
    const repo = AppDataSource.getRepository(Ubs)
    return repo.save(repo.create({ nome, endereco: 'Rua 1', telefone: '51000000000' }))
}

export async function criarEquipe(ubsId: number, perfil = PerfilEquipe.RECEPCAO, dados: Partial<UsuarioEquipe> = {}) {
    sequencia += 1
    const repo = AppDataSource.getRepository(UsuarioEquipe)
    return repo.save(repo.create({
        ubsId, perfil, nome: `Equipe ${sequencia}`, email: `equipe${sequencia}@teste.local`,
        senhaHash: await gerarHash(SENHA), ...dados
    }))
}

export async function criarProfissional(ubsId: number, dados: Partial<Profissional> = {}) {
    sequencia += 1
    const repo = AppDataSource.getRepository(Profissional)
    return repo.save(repo.create({ ubsId, nome: `Profissional ${sequencia}`, funcao: 'médico', categoria: CategoriaAtendimento.CONSULTA, ...dados }))
}

export async function criarRua(ubsId: number, medicoReferenciaId: number, nome?: string) {
    sequencia += 1
    const repo = AppDataSource.getRepository(Rua)
    return repo.save(repo.create({ ubsId, medicoReferenciaId, nome: nome ?? `Rua ${sequencia}` }))
}

export async function criarTipo(ubsId: number, dados: Partial<TipoAtendimento> = {}) {
    sequencia += 1
    const repo = AppDataSource.getRepository(TipoAtendimento)
    return repo.save(repo.create({
        ubsId, nome: `Tipo ${sequencia}`, categoria: CategoriaAtendimento.CONSULTA, duracaoMin: 20,
        antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null, ...dados
    }))
}

export async function criarSlot(profissionalId: number, tipoAtendimentoId: number, inicio: Date, dados: Partial<Slot> = {}) {
    const repo = AppDataSource.getRepository(Slot)
    const fim = new Date(inicio.getTime() + 20 * 60_000)
    return repo.save(repo.create({ profissionalId, tipoAtendimentoId, inicio, fim, origem: OrigemSlot.APP, status: StatusSlot.LIVRE, ...dados }))
}

export async function criarPaciente(ubsId: number, dados: Partial<Paciente> = {}) {
    sequencia += 1
    const repo = AppDataSource.getRepository(Paciente)
    return repo.save(repo.create({
        ubsId, nome: `Paciente ${sequencia}`, cpf: cpfValidoUnico(), cns: null, dataNascimento: '1980-01-01',
        ruaId: ruaPadraoId, numero: ruaPadraoId ? '10' : null,
        telefone: `5199999${String(sequencia).padStart(4, '0')}`, email: null, possuiCelular: true, pushToken: null,
        pontuacao: 100, vulneravel: false, vulneravelAtribuidoPor: null, vulneravelEm: null,
        consentimentoCanais: { WHATSAPP: { aceito: true, em: '2026-01-01T00:00:00.000Z' }, SMS: { aceito: true, em: '2026-01-01T00:00:00.000Z' } },
        senhaHash: await gerarHash(SENHA), deveTrocarSenha: false, ...dados
    }))
}

// Grava os padrões da seção 7 como valores globais (o que o seed faz)
export async function semearConfiguracao() {
    const repo = AppDataSource.getRepository(Configuracao)
    await repo.save(Object.entries(CONFIGURACAO_PADRAO).map(([chave, valor]) => repo.create({ chave, valor: JSON.stringify(valor), ubsId: null })))
}

// Cabeçalho Authorization sem passar pelo login (o login tem testes próprios)
export function authEquipe(usuario: UsuarioEquipe) {
    return `Bearer ${gerarToken({ tipo: TipoAutor.EQUIPE, id: usuario.id, ubsId: usuario.ubsId, perfil: usuario.perfil })}`
}

export function authPaciente(paciente: Paciente) {
    return `Bearer ${gerarToken({ tipo: TipoAutor.PACIENTE, id: paciente.id, ubsId: paciente.ubsId, deveTrocarSenha: paciente.deveTrocarSenha })}`
}

// RN-90: congela o relógio da aplicação num instante (horário local)
export function congelarEm(data: string | Date) {
    relogioAjustavel!.congelar(new Date(data))
}

export function zerarRelogio() {
    relogioAjustavel!.zerar()
}

// Cenário-base dos testes de agendamento: relógio congelado na segunda 16/11/2026 às 10:00,
// configuração padrão, uma UBS com recepção, um médico com uma rua (médico de referência), duas consultas
// médicas (uma liberada no app, outra só de balcão) e um paciente morando na rua do médico.
export const AGORA = '2026-11-16T10:00:00'

export function emDias(dias: number, hora = '09:00') {
    const base = new Date(`2026-11-16T${hora}:00`)
    base.setDate(base.getDate() + dias)
    return base
}

export async function montarCenario() {
    await semearConfiguracao()
    congelarEm(AGORA)
    const ubs = await criarUbs()
    const recepcao = await criarEquipe(ubs.id, PerfilEquipe.RECEPCAO)
    const profissional = await criarProfissional(ubs.id, { nome: 'Dra. Helena' })
    const rua = await criarRua(ubs.id, profissional.id, 'Rua das Flores')
    ruaPadraoId = rua.id
    const tipoApp = await criarTipo(ubs.id, { nome: 'Consulta clínica geral', permiteAgendamentoApp: true, antecedenciaMaximaDias: 60 })
    const tipoBalcao = await criarTipo(ubs.id, { nome: 'Renovação de receita', permiteAgendamentoApp: false, antecedenciaMaximaDias: 30 })
    const paciente = await criarPaciente(ubs.id)

    return {
        ubs, recepcao, profissional, rua, tipoApp, tipoBalcao, paciente,
        authRecepcao: authEquipe(recepcao),
        authPaciente: authPaciente(paciente),
        slot: (dias: number, dados: Partial<Slot> = {}, hora = '09:00') =>
            criarSlot(profissional.id, dados.tipoAtendimentoId ?? tipoApp.id, emDias(dias, hora), dados)
    }
}
