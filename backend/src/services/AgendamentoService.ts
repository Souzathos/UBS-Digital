import { EntityManager } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { AppDataSource } from "../config/dataSource";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../errors";
import {
    Agendamento, OrigemAgendamento, OrigemSlot, Paciente, Slot, STATUS_AGENDAMENTO_ATIVOS, StatusAgendamento,
    StatusSlot, TipoAtendimento, TipoAutor
} from "../models";
import { AgendaDoDiaInput } from "../dtos/agendamento";
import { somarDias } from "../utils/datas";
import { SessaoEquipe, SessaoPaciente } from "../utils/jwt";
import { ConfiguracaoService } from "./ConfiguracaoService";
import { AcaoLog, LogAcaoService } from "./LogAcaoService";
import { Autor } from "./tipos";

const DIA_MS = 24 * 60 * 60 * 1000

export const RELACOES_AGENDAMENTO = { slot: { profissional: true, tipoAtendimento: true }, paciente: { ubs: true } } as const

export interface AcoesDisponiveis {
    confirmar: boolean
    cancelar: boolean
    remarcar: boolean
}

export class AgendamentoService {
    private logs: LogAcaoService

    constructor(private readonly clock: Clock = relogioPadrao) {
        this.logs = new LogAcaoService(clock)
    }

    // ---------- Criação (RN-01 a RN-05) ----------

    async criarPeloPaciente(slotId: number, sessao: SessaoPaciente) {
        return this.criar(sessao.id, slotId, sessao.ubsId, { tipo: TipoAutor.PACIENTE, id: sessao.id, via: 'APP' })
    }

    async criarPelaEquipe(pacienteId: number, slotId: number, sessao: SessaoEquipe) {
        return this.criar(pacienteId, slotId, sessao.ubsId, { tipo: TipoAutor.EQUIPE, id: sessao.id, via: 'PAINEL' })
    }

    private async criar(pacienteId: number, slotId: number, ubsId: number, autor: Autor) {
        const id = await AppDataSource.transaction(async manager => {
            const agora = this.clock.now()

            // Lock no paciente serializa os pedidos dele (RN-04); lock no slot impede dois donos para a vaga
            const paciente = await manager.getRepository(Paciente).findOne({ where: { id: pacienteId }, lock: { mode: 'pessimistic_write' } })
            if(!paciente || paciente.ubsId !== ubsId) throw new NotFoundError('Paciente não encontrado')

            const { slot, tipo } = await this.travarSlot(manager, slotId, ubsId)
            this.validarSlotParaAgendar(slot, tipo, autor, agora)
            await this.validarUmAtivoPorTipo(manager, paciente.id, tipo.id)

            // RN-05 [sugestão confirmada]: criado com menos de N dias de antecedência já nasce CONFIRMADO
            const dias = await new ConfiguracaoService(manager).get('agendamento.confirmadoAutomaticoDias', ubsId)
            const confirmadoNaHora = slot.inicio.getTime() - agora.getTime() < dias * DIA_MS

            const repo = manager.getRepository(Agendamento)
            const agendamento = await repo.save(repo.create({
                pacienteId: paciente.id,
                slotId: slot.id,
                status: confirmadoNaHora ? StatusAgendamento.CONFIRMADO : StatusAgendamento.PENDENTE,
                origem: autor.tipo === TipoAutor.PACIENTE ? OrigemAgendamento.APP : OrigemAgendamento.RECEPCAO,
                remarcadoDeId: null,
                criadoPorTipo: autor.tipo,
                criadoPorId: autor.id,
                confirmadoEm: confirmadoNaHora ? agora : null,
                criadoEm: agora
            }))

            slot.status = StatusSlot.OCUPADO
            await manager.getRepository(Slot).save(slot)

            await this.logs.registrar(manager, agendamento.id, AcaoLog.CRIADO, autor, {
                slotId: slot.id, status: agendamento.status, confirmadoAutomatico: confirmadoNaHora
            })
            await this.aoCriar(manager, agendamento.id, agora)

            return agendamento.id
        })

        return this.carregar(id)
    }

    // ---------- Regras compartilhadas entre criar e remarcar ----------

    async travarSlot(manager: EntityManager, slotId: number, ubsId: number) {
        const slot = await manager.getRepository(Slot).findOne({ where: { id: slotId }, lock: { mode: 'pessimistic_write' } })
        if(!slot) throw new NotFoundError('Horário não encontrado')
        const tipo = await manager.getRepository(TipoAtendimento).findOneBy({ id: slot.tipoAtendimentoId })
        if(!tipo || tipo.ubsId !== ubsId) throw new NotFoundError('Horário não encontrado')
        return { slot, tipo }
    }

    validarSlotParaAgendar(slot: Slot, tipo: TipoAtendimento, autor: Autor, agora: Date) {
        if(slot.status !== StatusSlot.LIVRE) throw new ConflictError('Este horário não está mais disponível')
        if(slot.inicio <= agora) throw new BadRequestError('Este horário já passou')

        const peloPaciente = autor.tipo === TipoAutor.PACIENTE || autor.tipo === TipoAutor.CONTATO
        // RN-01: pelo app, só tipos liberados
        if(peloPaciente && !tipo.permiteAgendamentoApp) throw new ForbiddenError('Este tipo de atendimento só pode ser agendado na recepção da UBS')
        // RN-02: pelo app, só slots da cota do app
        if(peloPaciente && slot.origem !== OrigemSlot.APP) throw new ForbiddenError('Este horário é reservado para agendamento na recepção da UBS')
        // RN-03: antecedência máxima do tipo vale para todos
        if(slot.inicio > somarDias(agora, tipo.antecedenciaMaximaDias)) {
            throw new BadRequestError(`Este atendimento pode ser agendado com até ${tipo.antecedenciaMaximaDias} dias de antecedência`)
        }
    }

    // RN-04 [sugestão confirmada]: no máximo 1 agendamento ativo por tipo de atendimento
    async validarUmAtivoPorTipo(manager: EntityManager, pacienteId: number, tipoAtendimentoId: number, ignorarAgendamentoId?: number) {
        const query = manager.getRepository(Agendamento).createQueryBuilder('a')
            .innerJoin('a.slot', 's')
            .where('a.pacienteId = :pacienteId', { pacienteId })
            .andWhere('s.tipoAtendimentoId = :tipoAtendimentoId', { tipoAtendimentoId })
            .andWhere('a.status IN (:...ativos)', { ativos: STATUS_AGENDAMENTO_ATIVOS })
        if(ignorarAgendamentoId) query.andWhere('a.id <> :ignorar', { ignorar: ignorarAgendamentoId })

        if(await query.getExists()) throw new ConflictError('Você já tem um agendamento ativo deste tipo. Cancele ou remarque o atual')
    }

    // Ponto de extensão: lembretes do agendamento novo (Parte 6)
    protected async aoCriar(_manager: EntityManager, _agendamentoId: number, _agora: Date) {}

    // ---------- Leitura ----------

    async carregar(id: number, manager: EntityManager = AppDataSource.manager) {
        const agendamento = await manager.getRepository(Agendamento).findOne({ where: { id }, relations: RELACOES_AGENDAMENTO })
        if(!agendamento) throw new NotFoundError('Agendamento não encontrado')
        return agendamento
    }

    // O que o app/painel pode oferecer como botão agora (as próprias ações validam de novo)
    acoesDisponiveis(agendamento: Agendamento, agora = this.clock.now()): AcoesDisponiveis {
        const ativo = (STATUS_AGENDAMENTO_ATIVOS as readonly StatusAgendamento[]).includes(agendamento.status)
        const antesDoHorario = agendamento.slot.inicio > agora
        return {
            confirmar: agendamento.status === StatusAgendamento.PENDENTE && antesDoHorario,
            cancelar: ativo && antesDoHorario,
            remarcar: ativo && antesDoHorario
        }
    }

    // Seção 6, "Minhas consultas": próximas (ativas) e histórico
    async listarDoPaciente(sessao: SessaoPaciente) {
        const todos = await AppDataSource.getRepository(Agendamento).find({
            where: { pacienteId: sessao.id },
            relations: RELACOES_AGENDAMENTO
        })
        const agora = this.clock.now()
        const ativos = STATUS_AGENDAMENTO_ATIVOS as readonly StatusAgendamento[]
        const comAcoes = (a: Agendamento) => ({ agendamento: a, acoes: this.acoesDisponiveis(a, agora) })

        return {
            proximos: todos.filter(a => ativos.includes(a.status))
                .sort((a, b) => a.slot.inicio.getTime() - b.slot.inicio.getTime()).map(comAcoes),
            historico: todos.filter(a => !ativos.includes(a.status))
                .sort((a, b) => b.slot.inicio.getTime() - a.slot.inicio.getTime()).map(comAcoes)
        }
    }

    // Painel, "Agenda do dia": todos os agendamentos do dia na UBS, por horário
    async agendaDoDia({ data, profissionalId }: AgendaDoDiaInput, sessao: SessaoEquipe) {
        const inicio = new Date(`${data}T00:00:00`)
        const query = AppDataSource.getRepository(Agendamento).createQueryBuilder('a')
            .innerJoinAndSelect('a.slot', 's')
            .innerJoinAndSelect('s.profissional', 'prof')
            .innerJoinAndSelect('s.tipoAtendimento', 'tipo')
            .innerJoinAndSelect('a.paciente', 'p')
            .innerJoinAndSelect('p.ubs', 'ubs')
            .where('p.ubsId = :ubsId', { ubsId: sessao.ubsId })
            .andWhere('s.inicio >= :inicio AND s.inicio < :fim', { inicio, fim: somarDias(inicio, 1) })
            .orderBy('s.inicio', 'ASC')
            .addOrderBy('prof.nome', 'ASC')
            .addOrderBy('a.id', 'ASC')
        if(profissionalId) query.andWhere('s.profissionalId = :profissionalId', { profissionalId })

        const agora = this.clock.now()
        return (await query.getMany()).map(a => ({ agendamento: a, acoes: this.acoesDisponiveis(a, agora) }))
    }

    // Garante que o agendamento existe e pertence a quem pede (paciente dono ou equipe da mesma UBS)
    async obterDoAutor(manager: EntityManager, id: number, autor: Autor, ubsId: number, lock = false) {
        const agendamento = await manager.getRepository(Agendamento).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
        if(!agendamento) throw new NotFoundError('Agendamento não encontrado')

        const paciente = await manager.getRepository(Paciente).findOneBy({ id: agendamento.pacienteId })
        const dono = autor.tipo === TipoAutor.PACIENTE ? agendamento.pacienteId === autor.id : paciente?.ubsId === ubsId
        if(!dono) throw new NotFoundError('Agendamento não encontrado')

        return agendamento
    }
}

