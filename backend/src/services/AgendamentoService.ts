import { EntityManager, In } from "typeorm";
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
import { LembreteService } from "./LembreteService";
import { AcaoLog, LogAcaoService } from "./LogAcaoService";
import { Autor } from "./tipos";

const DIA_MS = 24 * 60 * 60 * 1000

export const RELACOES_AGENDAMENTO = { slot: { profissional: true, tipoAtendimento: true }, paciente: { ubs: true } } as const

export function estaAtivo(agendamento: Agendamento) {
    return (STATUS_AGENDAMENTO_ATIVOS as readonly StatusAgendamento[]).includes(agendamento.status)
}

// Mensagem para quem tenta agir sobre um agendamento que já saiu do ar
export function mensagemDeEstado(status: StatusAgendamento) {
    switch(status) {
        case StatusAgendamento.CANCELADO_PACIENTE:
        case StatusAgendamento.CANCELADO_AUTO: return 'Esta consulta já foi cancelada'
        case StatusAgendamento.REMARCADO: return 'Esta consulta já foi remarcada'
        case StatusAgendamento.COMPARECEU:
        case StatusAgendamento.FALTOU: return 'Esta consulta já aconteceu'
        default: return 'Esta consulta não aceita esta ação agora'
    }
}

export interface AcoesDisponiveis {
    confirmar: boolean
    cancelar: boolean
    remarcar: boolean
}

export class AgendamentoService {
    private logs: LogAcaoService
    private lembretes: LembreteService

    constructor(private readonly clock: Clock = relogioPadrao) {
        this.logs = new LogAcaoService(clock)
        this.lembretes = new LembreteService(clock)
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
            // RN-10 / RN-11: lembretes do agendamento novo
            await this.lembretes.agendar(manager, agendamento.id, agora)

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

    // ---------- Ações sobre um agendamento (RN-20 a RN-22) ----------

    // RN-20: confirmar muda para CONFIRMADO. RN-71: confirmar de novo não muda nada nem gera log.
    async confirmar(id: number, autor: Autor, ubsId: number) {
        await AppDataSource.transaction(async manager => {
            const agora = this.clock.now()
            const agendamento = await this.obterDoAutor(manager, id, autor, ubsId, true)
            if(agendamento.status === StatusAgendamento.CONFIRMADO) return
            if(agendamento.status !== StatusAgendamento.PENDENTE) throw new ConflictError(mensagemDeEstado(agendamento.status))

            const slot = await manager.getRepository(Slot).findOneByOrFail({ id: agendamento.slotId })
            if(slot.inicio <= agora) throw new ConflictError('O horário desta consulta já passou')

            agendamento.status = StatusAgendamento.CONFIRMADO
            agendamento.confirmadoEm = agora
            await manager.getRepository(Agendamento).save(agendamento)

            await this.lembretes.marcarRespondidas(manager, agendamento.id, agora)
            await this.logs.registrar(manager, agendamento.id, AcaoLog.CONFIRMADO, autor)
        })

        return this.carregar(id)
    }

    // RN-21: cancelar a qualquer momento antes do horário, inclusive depois de confirmar, sem perder
    // pontos. A vaga volta a ficar livre e entra no fluxo de adiantamento (RN-30, Camada 2).
    async cancelar(id: number, autor: Autor, ubsId: number) {
        await AppDataSource.transaction(async manager => {
            const agora = this.clock.now()
            const agendamento = await this.obterDoAutor(manager, id, autor, ubsId, true)
            if(agendamento.status === StatusAgendamento.CANCELADO_PACIENTE) return
            if(!estaAtivo(agendamento)) throw new ConflictError(mensagemDeEstado(agendamento.status))

            const [slot] = await this.travarSlots(manager, [agendamento.slotId])
            if(slot.inicio <= agora) throw new ConflictError('Só é possível cancelar antes do horário da consulta')

            agendamento.status = StatusAgendamento.CANCELADO_PACIENTE
            agendamento.canceladoEm = agora
            agendamento.canceladoPorTipo = autor.tipo
            await manager.getRepository(Agendamento).save(agendamento)

            slot.status = StatusSlot.LIVRE
            await manager.getRepository(Slot).save(slot)

            await this.lembretes.cancelarPendentes(manager, agendamento.id)
            await this.lembretes.marcarRespondidas(manager, agendamento.id, agora)
            await this.logs.registrar(manager, agendamento.id, AcaoLog.CANCELADO, autor, { slotId: slot.id })
            await this.aoLiberarVaga(manager, slot, agora)
        })

        return this.carregar(id)
    }

    // RN-22: troca direta por um slot livre do mesmo tipo, dentro da antecedência máxima. Cria um
    // agendamento novo CONFIRMADO (remarcadoDeId → antigo), marca o antigo REMARCADO e libera a vaga antiga.
    // RN-71: remarcar de novo para o mesmo horário devolve o agendamento novo, sem duplicar.
    async remarcar(id: number, novoSlotId: number, autor: Autor, ubsId: number) {
        const novoId = await AppDataSource.transaction(async manager => {
            const agora = this.clock.now()
            const antigo = await this.obterDoAutor(manager, id, autor, ubsId, true)

            if(antigo.status === StatusAgendamento.REMARCADO) {
                const jaFeito = await manager.getRepository(Agendamento).findOneBy({ remarcadoDeId: antigo.id })
                if(jaFeito && jaFeito.slotId === novoSlotId) return jaFeito.id
            }
            if(!estaAtivo(antigo)) throw new ConflictError(mensagemDeEstado(antigo.status))
            if(novoSlotId === antigo.slotId) throw new BadRequestError('Escolha um horário diferente do atual')

            await manager.getRepository(Paciente).findOne({ where: { id: antigo.pacienteId }, lock: { mode: 'pessimistic_write' } })
            const slots = await this.travarSlots(manager, [antigo.slotId, novoSlotId])
            const slotAntigo = slots.find(s => s.id === antigo.slotId)!
            const slotNovo = slots.find(s => s.id === novoSlotId)
            if(!slotNovo) throw new NotFoundError('Horário não encontrado')

            if(slotAntigo.inicio <= agora) throw new ConflictError('Só é possível remarcar antes do horário da consulta')
            const tipo = await manager.getRepository(TipoAtendimento).findOneBy({ id: slotNovo.tipoAtendimentoId })
            if(!tipo || tipo.ubsId !== ubsId) throw new NotFoundError('Horário não encontrado')
            if(slotNovo.tipoAtendimentoId !== slotAntigo.tipoAtendimentoId) throw new BadRequestError('Escolha um horário do mesmo tipo de atendimento')
            this.validarSlotParaAgendar(slotNovo, tipo, autor, agora)
            await this.validarUmAtivoPorTipo(manager, antigo.pacienteId, tipo.id, antigo.id)

            const repo = manager.getRepository(Agendamento)
            antigo.status = StatusAgendamento.REMARCADO
            await repo.save(antigo)

            const novo = await repo.save(repo.create({
                pacienteId: antigo.pacienteId,
                slotId: slotNovo.id,
                status: StatusAgendamento.CONFIRMADO,
                origem: OrigemAgendamento.REMARCACAO,
                remarcadoDeId: antigo.id,
                criadoPorTipo: autor.tipo,
                criadoPorId: autor.id,
                confirmadoEm: agora,
                criadoEm: agora
            }))

            slotAntigo.status = StatusSlot.LIVRE
            slotNovo.status = StatusSlot.OCUPADO
            await manager.getRepository(Slot).save([slotAntigo, slotNovo])

            await this.lembretes.cancelarPendentes(manager, antigo.id)
            await this.lembretes.marcarRespondidas(manager, antigo.id, agora)
            await this.lembretes.agendar(manager, novo.id, agora)

            await this.logs.registrar(manager, antigo.id, AcaoLog.REMARCADO, autor, { novoAgendamentoId: novo.id, novoSlotId: slotNovo.id })
            await this.logs.registrar(manager, novo.id, AcaoLog.CRIADO, autor, { remarcadoDeId: antigo.id, slotId: slotNovo.id, status: novo.status })
            await this.aoLiberarVaga(manager, slotAntigo, agora)

            return novo.id
        })

        return this.carregar(novoId)
    }

    // Lock em vários slots sempre na mesma ordem (id), para duas transações nunca se travarem
    private async travarSlots(manager: EntityManager, ids: number[]) {
        return manager.getRepository(Slot).find({ where: { id: In(ids) }, order: { id: 'ASC' }, lock: { mode: 'pessimistic_write' } })
    }

    // Ponto de extensão: RN-30 (Camada 2). Toda vaga liberada por cancelamento ou remarcação passa aqui,
    // dentro da mesma transação; o fluxo de adiantamento vai abrir a oferta a partir deste ponto.
    protected async aoLiberarVaga(_manager: EntityManager, _slot: Slot, _agora: Date) {}

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

