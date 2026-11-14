import { DataSource, MoreThanOrEqual } from "typeorm";
import { env } from "../config/env";
import { AppDataSource } from "../config/dataSource";
import { Configuracao, Paciente, Profissional, Rua, Slot, TipoAtendimento, Ubs, UsuarioEquipe } from "../models";
import { CategoriaAtendimento, PerfilEquipe, StatusSlot, TipoAutor } from "../models/enums";
import { clock } from "../clock";
import { AgendamentoService } from "../services/AgendamentoService";
import { medicoDeReferencia } from "../services/medicoDeReferencia";
import { SlotService } from "../services/SlotService";
import { comHorario, diasUteisAPartirDe, inicioDoDia, somarDias, somarMinutos } from "../utils/datas";
import { gerarHash } from "../utils/hash";
import { CONFIGURACAO_PADRAO } from "./dados/configuracao";
import { EQUIPE, SENHA_PADRAO } from "./dados/equipe";
import { AGENDAMENTOS_DEMO, PACIENTES } from "./dados/pacientes";
import { DIAS_DE_AGENDA, PROFISSIONAIS } from "./dados/profissionais";
import { TIPOS_ATENDIMENTO } from "./dados/tiposAtendimento";
import { UBS } from "./dados/ubs";

// Dados de demonstração da Camada 1: 1 UBS, equipe, profissionais, tipos, slots dos próximos
// dias úteis (com a cota do app) e pacientes. Os agendamentos de demonstração entram pela
// própria API (AgendamentoService), para passarem pelas regras e gerarem os lembretes.
export async function executarSeed(ds: DataSource, hoje: Date) {
    const ubs = await ds.getRepository(Ubs).save(ds.getRepository(Ubs).create(UBS))

    const senhaHash = await gerarHash(SENHA_PADRAO)
    await ds.getRepository(UsuarioEquipe).save(
        EQUIPE.map(e => ds.getRepository(UsuarioEquipe).create({ ...e, ubsId: ubs.id, senhaHash }))
    )

    const tipos = await ds.getRepository(TipoAtendimento).save(
        TIPOS_ATENDIMENTO.map(t => ds.getRepository(TipoAtendimento).create({ ...t, ubsId: ubs.id }))
    )
    const tipoPorChave = Object.fromEntries(TIPOS_ATENDIMENTO.map((t, i) => [t.chave, tipos[i]]))

    const cotaApp = Number(CONFIGURACAO_PADRAO['agendamento.cotaAppPercentual'])
    const dias = diasUteisAPartirDe(somarDias(hoje, 1), DIAS_DE_AGENDA)
    const ruaPorNome: Record<string, Rua> = {}
    let totalSlots = 0

    for(const dados of PROFISSIONAIS) {
        const profissional = await ds.getRepository(Profissional).save(
            ds.getRepository(Profissional).create({ nome: dados.nome, funcao: dados.funcao, categoria: dados.categoria, ubsId: ubs.id })
        )

        // Médico de referência das ruas da área dele
        for(const nome of dados.ruas ?? []) {
            ruaPorNome[nome] = await ds.getRepository(Rua).save(ds.getRepository(Rua).create({ ubsId: ubs.id, nome, medicoReferenciaId: profissional.id }))
        }

        // Horários dos turnos; os tipos entram em rodízio pela lista do profissional
        const horarios: { inicio: Date, fim: Date, tipoAtendimentoId: number }[] = []
        for(const dia of dias) {
            for(const [abre, fecha] of dados.turnos) {
                let inicio = comHorario(dia, abre)
                const fimTurno = comHorario(dia, fecha)
                while(true) {
                    const tipo = tipoPorChave[dados.tipos[horarios.length % dados.tipos.length]]
                    const fim = somarMinutos(inicio, tipo.duracaoMin)
                    if(fim > fimTurno) break
                    horarios.push({ inicio, fim, tipoAtendimentoId: tipo.id })
                    inicio = fim
                }
            }
        }

        // RN-02: parte da agenda de cada profissional fica reservada para o app
        const origens = SlotService.marcarCota(horarios.length, cotaApp)
        const slots = horarios.map((h, i) => ds.getRepository(Slot).create({
            profissionalId: profissional.id,
            tipoAtendimentoId: h.tipoAtendimentoId,
            inicio: h.inicio,
            fim: h.fim,
            origem: origens[i],
            status: StatusSlot.LIVRE
        }))
        await ds.getRepository(Slot).save(slots, { chunk: 500 })
        totalSlots += slots.length
    }

    const pontosIniciais = Number(CONFIGURACAO_PADRAO['pontos.inicial'])
    const consentimentoEm = hoje.toISOString()
    const pacientes = await ds.getRepository(Paciente).save(
        PACIENTES.map(({ consentimentos, rua, ...p }) => ds.getRepository(Paciente).create({
            ...p, ubsId: ubs.id, senhaHash, pontuacao: pontosIniciais,
            ruaId: rua ? ruaPorNome[rua].id : null,
            // RN-80: consentimento registrado por canal
            consentimentoCanais: Object.fromEntries(consentimentos.map(c => [c, { aceito: true, em: consentimentoEm }]))
        }))
    )

    await ds.getRepository(Configuracao).save(
        Object.entries(CONFIGURACAO_PADRAO).map(([chave, valor]) =>
            ds.getRepository(Configuracao).create({ chave, valor: JSON.stringify(valor), ubsId: null })
        )
    )

    // Agendamentos de demonstração, criados pela recepção através do service (passam pelas regras e já
    // geram os lembretes). Com o relógio de dev dá para ver D-14, D-7, D-3 e D-0 saírem.
    const recepcao = await ds.getRepository(UsuarioEquipe).findOneByOrFail({ ubsId: ubs.id, perfil: PerfilEquipe.RECEPCAO })
    const sessao = { tipo: TipoAutor.EQUIPE as const, id: recepcao.id, ubsId: ubs.id, perfil: recepcao.perfil }
    const agendamentos = new AgendamentoService({ now: () => hoje })
    let demos = 0
    for(const demo of AGENDAMENTOS_DEMO) {
        const paciente = pacientes[demo.paciente]
        const tipo = tipoPorChave[demo.tipo]
        // Consulta médica: só horários do médico da rua do paciente
        const medico = tipo.categoria === CategoriaAtendimento.CONSULTA ? await medicoDeReferencia(ds.manager, paciente) : null
        const slot = await ds.getRepository(Slot).findOne({
            where: {
                tipoAtendimentoId: tipo.id,
                status: StatusSlot.LIVRE,
                inicio: MoreThanOrEqual(somarDias(inicioDoDia(hoje), demo.emDias)),
                ...(medico ? { profissionalId: medico.id } : {})
            },
            order: { inicio: 'ASC' }
        })
        if(!slot) continue
        await agendamentos.criarPelaEquipe(paciente.id, slot.id, sessao)
        demos += 1
    }

    return {
        ubs: ubs.nome,
        equipe: EQUIPE.length,
        tipos: tipos.length,
        profissionais: PROFISSIONAIS.length,
        ruas: Object.keys(ruaPorNome).length,
        slots: totalSlots,
        pacientes: PACIENTES.length,
        configuracoes: Object.keys(CONFIGURACAO_PADRAO).length,
        agendamentosDemo: demos
    }
}

export async function limparTudo(ds: DataSource) {
    const tabelas = ds.entityMetadatas.map(e => `"${e.tableName}"`)
    await ds.query(`TRUNCATE TABLE ${tabelas.join(', ')} RESTART IDENTITY CASCADE`)
}

async function main() {
    if(env.NODE_ENV === 'production') throw new Error('O seed não roda em produção')

    await AppDataSource.initialize()

    const jaAplicado = await AppDataSource.getRepository(Ubs).count() > 0
    if(jaAplicado) {
        if(!process.argv.includes('--reset')) {
            console.log('Seed já aplicado. Use "npm run seed -- --reset" para apagar tudo e recriar.')
            await AppDataSource.destroy()
            return
        }
        await limparTudo(AppDataSource)
    }

    const resumo = await executarSeed(AppDataSource, clock.now())
    console.log('Seed aplicado:', resumo)
    console.log(`Logins: ${EQUIPE.map(e => e.email).join(', ')} e CPF dos pacientes, todos com a senha ${SENHA_PADRAO}`)

    await AppDataSource.destroy()
}

if(require.main === module) {
    main().catch(error => {
        console.error('Falha no seed:', error)
        process.exit(1)
    })
}
