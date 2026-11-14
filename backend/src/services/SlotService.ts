import { Between, EntityManager, FindOptionsWhere, In, MoreThan } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { AppDataSource } from "../config/dataSource";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import { CategoriaAtendimento, OrigemSlot, Paciente, Profissional, Slot, StatusSlot, TipoAtendimento } from "../models";
import { CriarSlotsEmLoteInput, ListarSlotsInput } from "../dtos/slot";
import { comHorario, ehDiaUtil, inicioDoDia, somarDias, somarMinutos } from "../utils/datas";
import { SessaoEquipe, SessaoPaciente } from "../utils/jwt";
import { ConfiguracaoService } from "./ConfiguracaoService";
import { exigirMedicoDaRua } from "./medicoDeReferencia";

const LIMITE_LISTAGEM = 500
const MAX_DIAS_LOTE = 92

export class SlotService {
    constructor(private readonly clock: Clock = relogioPadrao, private readonly manager: EntityManager = AppDataSource.manager) {}

    // RN-02: reparte a cota do app espalhada pela agenda do profissional (40% → 2 de cada 5 slots),
    // em vez de concentrar os slots do app no fim do período. Devolve a origem de cada posição.
    static marcarCota(total: number, percentual: number): OrigemSlot[] {
        if(percentual < 0 || percentual > 100) throw new Error('Percentual da cota deve ficar entre 0 e 100')

        const alvo = Math.round(total * percentual / 100)
        const origens: OrigemSlot[] = []
        let acumulado = 0

        for(let i = 0; i < total; i++) {
            acumulado += alvo
            if(acumulado >= total) {
                acumulado -= total
                origens.push(OrigemSlot.APP)
            } else {
                origens.push(OrigemSlot.RECEPCAO)
            }
        }

        return origens
    }

    // Painel, "Slots": criação em lote por profissional. A duração vem do tipo de atendimento e a
    // cota do app (RN-02) da Configuracao da UBS. Horários que já existem são ignorados.
    async criarEmLote(dados: CriarSlotsEmLoteInput, sessao: SessaoEquipe) {
        const profissional = await this.manager.getRepository(Profissional).findOneBy({ id: dados.profissionalId, ubsId: sessao.ubsId })
        if(!profissional) throw new NotFoundError('Profissional não encontrado')
        const tipo = await this.manager.getRepository(TipoAtendimento).findOneBy({ id: dados.tipoAtendimentoId, ubsId: sessao.ubsId })
        if(!tipo) throw new NotFoundError('Tipo de atendimento não encontrado')
        if(profissional.categoria !== tipo.categoria) {
            throw new BadRequestError(tipo.categoria === CategoriaAtendimento.CONSULTA
                ? 'Consultas são feitas por médicos. Escolha um médico para este horário'
                : 'Procedimentos são feitos pela enfermagem. Escolha um profissional da enfermagem')
        }

        const agora = this.clock.now()
        const primeiroDia = new Date(`${dados.dataInicio}T00:00:00`)
        const ultimoDia = new Date(`${dados.dataFim}T00:00:00`)
        if(ultimoDia < primeiroDia) throw new BadRequestError('A data final deve ser igual ou depois da inicial')
        if(primeiroDia < inicioDoDia(agora)) throw new BadRequestError('Não é possível criar horários em dias que já passaram')
        if(somarDias(primeiroDia, MAX_DIAS_LOTE) < ultimoDia) throw new BadRequestError(`O lote pode cobrir no máximo ${MAX_DIAS_LOTE} dias`)

        const horarios: { inicio: Date, fim: Date }[] = []
        for(let dia = primeiroDia; dia <= ultimoDia; dia = somarDias(dia, 1)) {
            if(dados.apenasDiasUteis && !ehDiaUtil(dia)) continue
            const fimTurno = comHorario(dia, dados.horaFim)
            for(let inicio = comHorario(dia, dados.horaInicio); somarMinutos(inicio, tipo.duracaoMin) <= fimTurno; inicio = somarMinutos(inicio, tipo.duracaoMin)) {
                if(inicio > agora) horarios.push({ inicio, fim: somarMinutos(inicio, tipo.duracaoMin) })
            }
        }
        if(horarios.length === 0) throw new BadRequestError('Nenhum horário cabe no período informado')

        const existentes = await this.manager.getRepository(Slot).find({
            select: { inicio: true },
            where: { profissionalId: profissional.id, inicio: Between(horarios[0].inicio, horarios[horarios.length - 1].inicio) }
        })
        const ocupados = new Set(existentes.map(s => s.inicio.getTime()))
        const novos = horarios.filter(h => !ocupados.has(h.inicio.getTime()))

        const cotaAppPercentual = await new ConfiguracaoService(this.manager).get('agendamento.cotaAppPercentual', sessao.ubsId)
        const origens = SlotService.marcarCota(novos.length, cotaAppPercentual)
        const repo = this.manager.getRepository(Slot)
        await repo.save(novos.map((h, i) => repo.create({
            profissionalId: profissional.id, tipoAtendimentoId: tipo.id, inicio: h.inicio, fim: h.fim, origem: origens[i], status: StatusSlot.LIVRE
        })), { chunk: 500 })

        return {
            criados: novos.length,
            ignorados: horarios.length - novos.length,
            cotaApp: origens.filter(o => o === OrigemSlot.APP).length,
            cotaAppPercentual
        }
    }

    // Seção 6, "Agendar" no app: só tipos liberados (RN-01), só slots da cota do app (RN-02),
    // livres, no futuro e dentro da antecedência máxima do tipo (RN-03)
    async listarParaPaciente(filtros: ListarSlotsInput, sessao: SessaoPaciente) {
        if(!filtros.tipoAtendimentoId) throw new BadRequestError('Informe o tipo de atendimento')

        const tipo = await this.manager.getRepository(TipoAtendimento).findOneBy({ id: filtros.tipoAtendimentoId, ubsId: sessao.ubsId })
        if(!tipo) throw new NotFoundError('Tipo de atendimento não encontrado')
        if(!tipo.permiteAgendamentoApp) throw new ForbiddenError('Este tipo de atendimento só pode ser agendado na recepção da UBS')

        // 14/11: consulta médica só mostra horários do médico da rua do paciente
        const paciente = await this.manager.getRepository(Paciente).findOneByOrFail({ id: sessao.id })
        const medico = await exigirMedicoDaRua(this.manager, paciente, tipo.categoria)
        if(medico && filtros.profissionalId && filtros.profissionalId !== medico.id) return []

        const agora = this.clock.now()
        const limite = somarDias(agora, tipo.antecedenciaMaximaDias)
        const { de, ate } = this.janela(filtros, agora, limite)
        const profissionalId = medico?.id ?? filtros.profissionalId

        return this.buscar({
            tipoAtendimentoId: tipo.id,
            origem: OrigemSlot.APP,
            status: StatusSlot.LIVRE,
            ...(profissionalId ? { profissionalId } : {}),
            inicio: Between(de, ate)
        })
    }

    // Painel: a recepção enxerga todos os slots (RN-02); por padrão só os livres e futuros
    async listarParaEquipe(filtros: ListarSlotsInput, sessao: SessaoEquipe) {
        const agora = this.clock.now()
        const { de, ate } = this.janela(filtros, agora, null)
        const tipos = await this.manager.getRepository(TipoAtendimento).find({ select: { id: true }, where: { ubsId: sessao.ubsId } })
        const idsTipos = tipos.map(t => t.id).filter(id => !filtros.tipoAtendimentoId || id === filtros.tipoAtendimentoId)
        if(idsTipos.length === 0) return []

        // "Agendar pela recepção": com o paciente escolhido, consulta médica só com o médico da rua dele
        let profissionalId = filtros.profissionalId
        if(filtros.pacienteId) {
            if(!filtros.tipoAtendimentoId) throw new BadRequestError('Informe o tipo de atendimento')
            const paciente = await this.manager.getRepository(Paciente).findOneBy({ id: filtros.pacienteId, ubsId: sessao.ubsId })
            if(!paciente) throw new NotFoundError('Paciente não encontrado')
            const tipo = await this.manager.getRepository(TipoAtendimento).findOneByOrFail({ id: filtros.tipoAtendimentoId })
            const medico = await exigirMedicoDaRua(this.manager, paciente, tipo.categoria)
            if(medico && profissionalId && profissionalId !== medico.id) return []
            profissionalId = medico?.id ?? profissionalId
        }

        return this.buscar({
            tipoAtendimentoId: In(idsTipos),
            status: filtros.status ?? StatusSlot.LIVRE,
            ...(profissionalId ? { profissionalId } : {}),
            inicio: ate ? Between(de, ate) : MoreThan(de)
        })
    }

    private janela(filtros: ListarSlotsInput, agora: Date, limite: Date | null): { de: Date, ate: Date } {
        let de = filtros.de ? new Date(`${filtros.de}T00:00:00`) : agora
        if(de < agora) de = agora
        let ate = filtros.ate ? somarDias(new Date(`${filtros.ate}T00:00:00`), 1) : (limite ?? somarDias(de, 60))
        if(limite && ate > limite) ate = limite
        return { de, ate }
    }

    private buscar(where: FindOptionsWhere<Slot>) {
        return this.manager.getRepository(Slot).find({
            where,
            relations: { profissional: true, tipoAtendimento: true },
            order: { inicio: 'ASC', profissionalId: 'ASC' },
            take: LIMITE_LISTAGEM
        })
    }
}

