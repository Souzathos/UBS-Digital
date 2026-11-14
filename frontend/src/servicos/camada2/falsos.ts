import { ApiErro } from '@/api/cliente'
import type { Canal } from '@/api/tipos'
import { diaISO } from '@/utils/datas'
import type {
    Alerta,
    AlertasServico,
    AvisoConsulta,
    AvisosServico,
    CompromissoServico,
    ContatoVinculado,
    EtapaAviso,
    FichaCamada2Servico,
    OfertaPaciente,
    OfertasEquipeServico,
    OfertasServico,
    Selo,
    Suplencia,
    VagaEmOferta
} from './contratos'

// Erros saem como promessa rejeitada (funções async), igual ao cliente HTTP real.
// Implementações FALSAS da Camada 2: dados em memória, com atraso parecido com a rede e estado
// que muda (aceitar uma oferta muda a oferta; atribuir um alerta muda o alerta). Nada aqui chama
// a API. As telas que usam estes serviços mostram a etiqueta "Exemplo" em desenvolvimento.

const atraso = <T,>(valor: T, ms = 300) => new Promise<T>(resolve => setTimeout(() => resolve(valor), ms))

const HORA = 3_600_000
const DIA = 24 * HORA

// "daqui a N dias, às H:M" no horário de São Paulo (UTC−3)
function emDias(dias: number, hora: number, minuto = 0): string {
    const dia = diaISO(new Date(Date.now() + dias * DIA))
    return new Date(`${dia}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00-03:00`).toISOString()
}

// --- Avisos ---

const ETAPAS: { etapa: EtapaAviso; dias: number }[] = [
    { etapa: 'D14', dias: 14 },
    { etapa: 'D7', dias: 7 },
    { etapa: 'D3', dias: 3 },
    { etapa: 'D0', dias: 0 }
]

export const avisosFalso: AvisosServico = {
    async listar(a) {
        const inicio = new Date(a.inicio).getTime()
        const criado = new Date(a.criadoEm).getTime()
        const confirmado = a.confirmadoEm ? new Date(a.confirmadoEm).getTime() : null
        const agora = Date.now()
        const avisos: AvisoConsulta[] = []
        for (const { etapa, dias } of ETAPAS) {
            // Lembretes saem às 7h; etapa cujo dia já passou na hora de agendar é pulada (RN-11).
            const data = new Date(`${diaISO(new Date(inicio - dias * DIA))}T07:00:00-03:00`).getTime()
            if (data < criado - DIA || data >= inicio) continue
            let estado: AvisoConsulta['estado']
            if (a.status === 'CANCELADO_AUTO') estado = etapa === 'D0' ? 'agendado' : 'semResposta'
            else if (data > agora) estado = 'agendado'
            else if (etapa === 'D0' || (confirmado && data >= confirmado)) estado = 'lembrete'
            else if (confirmado) estado = 'respondido'
            else estado = 'enviado'
            avisos.push({ etapa, data: new Date(data).toISOString(), estado, canais: ['WHATSAPP', 'SMS'] })
        }
        const pendente = a.status === 'PENDENTE'
        return atraso({
            avisos: a.status === 'CANCELADO_AUTO' ? avisos.filter(x => x.etapa !== 'D0') : avisos,
            // O prazo real vem da Configuracao (semResposta.prazoD3Horas); aqui, 48h de exemplo.
            prazoResposta: pendente ? new Date(inicio - 48 * HORA).toISOString() : null,
            canceladoAutomaticamenteEm: a.status === 'CANCELADO_AUTO' ? new Date(inicio - 48 * HORA).toISOString() : null
        })
    }
}

// --- Ofertas do paciente ---

let ofertas: OfertaPaciente[] | null = null

function ofertasIniciais(): OfertaPaciente[] {
    return [
        {
            id: 901,
            status: 'PENDENTE',
            vaga: { inicio: emDias(3, 14, 10), tipoAtendimento: { nome: 'Consulta clínica geral', categoria: 'CONSULTA' }, profissional: { id: 1, nome: 'Dra. Helena' }, ubs: 'UBS Feitoria' },
            agendamentoAtual: { id: 0, inicio: emDias(12, 9, 40) },
            expiraEm: new Date(Date.now() + 23 * HORA + 40 * 60_000).toISOString(),
            simultanea: false
        }
    ]
}

async function responderOferta(id: number, status: 'ACEITA' | 'RECUSADA') {
    ofertas ??= ofertasIniciais()
    const oferta = ofertas.find(o => o.id === id)
    if (!oferta) throw new ApiErro(404, 'Esta oferta não existe mais.')
    if (oferta.status !== 'PENDENTE') throw new ApiErro(409, 'Esta oferta já foi respondida.')
    oferta.status = status
    return atraso({ ...oferta })
}

export const ofertasFalso: OfertasServico = {
    minhas: () => {
        ofertas ??= ofertasIniciais()
        return atraso(ofertas.map(o => ({ ...o })))
    },
    aceitar: id => responderOferta(id, 'ACEITA'),
    manter: id => responderOferta(id, 'RECUSADA')
}

// --- Compromisso e suplentes ---

const suplencias: Suplencia[] = [
    { tipoAtendimento: { id: 1, nome: 'Consulta clínica geral', categoria: 'CONSULTA' }, ativo: false },
    { tipoAtendimento: { id: 11, nome: 'Vacinação', categoria: 'PROCEDIMENTO' }, ativo: false }
]

async function mudarSuplencia(tipoAtendimentoId: number, ativo: boolean) {
    const s = suplencias.find(x => x.tipoAtendimento.id === tipoAtendimentoId)
    if (!s) throw new ApiErro(404, 'Tipo de atendimento não encontrado.')
    s.ativo = ativo
    return atraso({ ...s })
}

export const compromissoFalso: CompromissoServico = {
    situacao: () => atraso({ recebeOfertas: true }),
    suplencias: () => atraso(suplencias.map(s => ({ ...s }))),
    entrarNaLista: id => mudarSuplencia(id, true),
    sairDaLista: id => mudarSuplencia(id, false)
}

// --- Painel: ofertas em andamento ---

export const ofertasEquipeFalso: OfertasEquipeServico = {
    emAndamento: () => {
        const vagas: VagaEmOferta[] = [
            {
                id: 801,
                vaga: { inicio: emDias(1, 8, 20), tipoAtendimento: { nome: 'Consulta clínica geral', categoria: 'CONSULTA' }, profissional: { id: 1, nome: 'Dra. Helena' } },
                liberadaPor: 'Lucas F.',
                liberadaEm: new Date(Date.now() - 15 * 60_000).toISOString(),
                simultanea: true,
                prazo: new Date(Date.now() + 45 * 60_000).toISOString(),
                fila: [
                    { ordem: 1, nome: 'Tânia R.', nota: 'Consulta em ' + diaCurto(emDias(8, 10)), estado: 'aguardando' },
                    { ordem: 2, nome: 'João V.', nota: 'Consulta em ' + diaCurto(emDias(11, 9)), estado: 'recusou' },
                    { ordem: 3, nome: 'Paulo M.', nota: 'Suplente', estado: 'aguardando' },
                    { ordem: 4, nome: 'Marina S.', nota: 'Consulta em ' + diaCurto(emDias(13, 14)), estado: 'aguardando' },
                    { ordem: 5, nome: 'Carla T.', nota: 'Suplente', estado: 'aguardando' }
                ]
            },
            {
                id: 802,
                vaga: { inicio: emDias(5, 11), tipoAtendimento: { nome: 'Vacinação', categoria: 'PROCEDIMENTO' }, profissional: { id: 6, nome: 'Enf. Paula' } },
                liberadaPor: 'Ivone S.',
                liberadaEm: new Date(Date.now() - 60 * 60_000).toISOString(),
                simultanea: false,
                prazo: new Date(Date.now() + 23 * HORA).toISOString(),
                fila: [
                    { ordem: null, nome: 'Diego F.', nota: 'Vacinação em ' + diaCurto(emDias(6, 9)), estado: 'abaixoDoLimite' },
                    { ordem: 1, nome: 'Tânia R.', nota: 'Vacinação em ' + diaCurto(emDias(7, 8)), estado: 'aguardando', prazo: new Date(Date.now() + 23 * HORA).toISOString() },
                    { ordem: 2, nome: 'João V.', nota: 'Vacinação em ' + diaCurto(emDias(11, 10)), estado: 'proximo' },
                    { ordem: 3, nome: 'Suplentes', nota: 'Paulo M. e mais 2', estado: 'depois' }
                ]
            }
        ]
        return atraso(vagas)
    },
    reaproveitadas: () => atraso(2)
}

function diaCurto(iso: string) {
    const [, mes, dia] = diaISO(iso).split('-')
    return `${Number(dia)}/${mes}`
}

// --- Painel: alertas ---

let alertas: Alerta[] | null = null

function alertasIniciais(): Alerta[] {
    return [
        { id: 701, paciente: { id: 0, nome: 'José A.', idade: 81 }, consulta: emDias(1, 10, 20), motivo: 'Não respondeu aos 3 avisos. Não tem contato vinculado.', status: 'ABERTO', responsavel: null, atualizadoEm: new Date(Date.now() - 20 * HORA).toISOString() },
        { id: 702, paciente: { id: 0, nome: 'Sandra P.', idade: 72 }, consulta: emDias(0, 11, 40), motivo: 'Não respondeu aos 3 avisos. A filha também não.', status: 'EM_CONTATO', responsavel: 'ACS Márcio', atualizadoEm: new Date(Date.now() - 2 * DIA).toISOString() },
        { id: 703, paciente: { id: 0, nome: 'Maria L.', idade: 77 }, consulta: emDias(1, 14, 10), motivo: 'Não respondeu aos 3 avisos.', status: 'RESOLVIDO', responsavel: 'Recepção', atualizadoEm: new Date(Date.now() - DIA).toISOString() }
    ]
}

async function mudarAlerta(id: number, de: Alerta['status'], para: Alerta['status'], responsavel: string) {
    alertas ??= alertasIniciais()
    const alerta = alertas.find(a => a.id === id)
    if (!alerta) throw new ApiErro(404, 'Alerta não encontrado.')
    if (alerta.status !== de) throw new ApiErro(409, 'Este alerta já mudou. Atualize a tela.')
    alerta.status = para
    alerta.responsavel = responsavel
    alerta.atualizadoEm = new Date().toISOString()
    return atraso({ ...alerta })
}

export const alertasFalso: AlertasServico = {
    listar: () => {
        alertas ??= alertasIniciais()
        return atraso(alertas.map(a => ({ ...a })))
    },
    atribuirAoAcs: id => mudarAlerta(id, 'ABERTO', 'EM_CONTATO', 'ACS Márcio'),
    resolver: id => mudarAlerta(id, 'EM_CONTATO', 'RESOLVIDO', 'Recepção')
}

// --- Painel: contato vinculado e selo ---

const contatos = new Map<number, ContatoVinculado[]>()
const selos = new Map<number, Selo>()

function contatosDe(pacienteId: number) {
    if (!contatos.has(pacienteId)) {
        contatos.set(pacienteId, [
            { id: pacienteId * 10 + 1, nome: 'Lúcia (exemplo)', relacao: 'filha', telefone: '51999990142', canais: ['WHATSAPP', 'SMS'], consentimentoEm: new Date(Date.now() - 2 * DIA).toISOString(), consentimentoForma: 'termo assinado na recepção', recebeNotificacoes: true }
        ])
    }
    return contatos.get(pacienteId)!
}

function acharContato(contatoId: number) {
    for (const lista of contatos.values()) {
        const c = lista.find(x => x.id === contatoId)
        if (c) return c
    }
    throw new ApiErro(404, 'Contato não encontrado.')
}

export const fichaFalsa: FichaCamada2Servico = {
    contatos: pacienteId => atraso(contatosDe(pacienteId).map(c => ({ ...c }))),
    alternarCanalContato: async (contatoId, canal: Canal) => {
        const c = acharContato(contatoId)
        c.canais = c.canais.includes(canal) ? c.canais.filter(x => x !== canal) : [...c.canais, canal]
        return atraso({ ...c })
    },
    alternarConsentimento: async contatoId => {
        const c = acharContato(contatoId)
        c.recebeNotificacoes = !c.recebeNotificacoes
        c.consentimentoEm = c.recebeNotificacoes ? new Date().toISOString() : null
        return atraso({ ...c })
    },
    // Começa igual ao que a API já devolve em `vulneravel`; a mudança fica só na memória.
    selo: (pacienteId, atual) => atraso(selos.get(pacienteId) ?? { vulneravel: atual, atribuidoPor: null, em: null }),
    definirSelo: (pacienteId, vulneravel, quem) => {
        const selo: Selo = { vulneravel, atribuidoPor: quem, em: new Date().toISOString() }
        selos.set(pacienteId, selo)
        return atraso(selo)
    }
}
