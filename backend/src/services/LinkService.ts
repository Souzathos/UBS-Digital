import { Clock, clock as relogioPadrao } from "../clock";
import { AppDataSource } from "../config/dataSource";
import { Agendamento, LinkToken, TipoAutor } from "../models";
import { AcoesDisponiveis, AgendamentoService } from "./AgendamentoService";
import { LinkTokenService } from "./LinkTokenService";
import { SlotService } from "./SlotService";
import { Autor } from "./tipos";

const MAX_HORARIOS_REMARCAR = 30

export interface PaginaAgendamento {
    tipo: 'AGENDAMENTO'
    ubs: { nome: string, endereco: string, telefone: string }
    inicio: Date
    status: Agendamento['status']
    // RN-57: tipo de atendimento e preparo só para o próprio paciente
    tipoAtendimento: { nome: string, instrucoesPreparo: string | null } | null
    profissional: string | null
    remarcadoPara: Date | null
    acoes: AcoesDisponiveis
}

export type EstadoLink = { tipo: 'INVALIDO' } | { tipo: 'EXPIRADO' } | PaginaAgendamento

type Validado = { linkToken: LinkToken, agendamento: Agendamento, remarcadoPara: Date | null }

// Página do link de ação (RN-70 a RN-73): resolve o token, monta o que a página mostra e executa as
// ações em nome do destinatário do token, reaproveitando as regras do AgendamentoService.
export class LinkService {
    private tokens: LinkTokenService
    private agendamentos: AgendamentoService

    constructor(private readonly clock: Clock = relogioPadrao) {
        this.tokens = new LinkTokenService(clock)
        this.agendamentos = new AgendamentoService(clock)
    }

    async abrir(token: string): Promise<EstadoLink> {
        const validado = await this.validar(token)
        if('tipo' in validado) return validado
        return this.montarPagina(validado)
    }

    async confirmar(token: string) {
        return this.agir(token, (v, autor) => this.agendamentos.confirmar(v.agendamento.id, autor, v.agendamento.paciente.ubsId))
    }

    async cancelar(token: string) {
        return this.agir(token, (v, autor) => this.agendamentos.cancelar(v.agendamento.id, autor, v.agendamento.paciente.ubsId))
    }

    async remarcar(token: string, slotId: number) {
        return this.agir(token, (v, autor) => this.agendamentos.remarcar(v.agendamento.id, slotId, autor, v.agendamento.paciente.ubsId))
    }

    // RN-22 pelo link: horários livres do mesmo tipo, com as mesmas regras do app (RN-01 a RN-03)
    async horariosParaRemarcar(token: string) {
        const validado = await this.validar(token)
        if('tipo' in validado) return { estado: validado, horarios: [] }

        const { agendamento } = validado
        const pagina = this.montarPagina(validado)
        if(!pagina.acoes.remarcar) return { estado: pagina, horarios: [] }

        const sessao = { tipo: TipoAutor.PACIENTE as const, id: agendamento.pacienteId, ubsId: agendamento.paciente.ubsId, deveTrocarSenha: false }
        const slots = await new SlotService(this.clock).listarParaPaciente({ tipoAtendimentoId: agendamento.slot.tipoAtendimentoId }, sessao)
            .catch(() => [])

        return {
            estado: pagina,
            horarios: slots.filter(s => s.id !== agendamento.slotId).slice(0, MAX_HORARIOS_REMARCAR)
                .map(s => ({ slotId: s.id, inicio: s.inicio, profissional: s.profissional.nome }))
        }
    }

    private async agir(token: string, acao: (v: Validado, autor: Autor) => Promise<unknown>) {
        const validado = await this.validar(token)
        if('tipo' in validado) return validado

        // RN-82: o autor é o destinatário do link (paciente; contato vinculado na Camada 2)
        const autor: Autor = { tipo: validado.linkToken.destinatarioTipo, id: validado.linkToken.destinatarioId, via: 'LINK' }
        await acao(validado, autor)
        await this.tokens.marcarUsado(AppDataSource.manager, validado.linkToken)

        return null
    }

    private async validar(token: string): Promise<Validado | { tipo: 'INVALIDO' } | { tipo: 'EXPIRADO' }> {
        const resolucao = await this.tokens.resolver(token)
        if(resolucao.estado === 'INVALIDO' || !resolucao.linkToken.agendamentoId) return { tipo: 'INVALIDO' }
        if(resolucao.estado === 'EXPIRADO') return { tipo: 'EXPIRADO' }

        const agendamento = await this.agendamentos.carregar(resolucao.linkToken.agendamentoId)
        const novo = await AppDataSource.getRepository(Agendamento).findOne({ where: { remarcadoDeId: agendamento.id }, relations: { slot: true } })
        return { linkToken: resolucao.linkToken, agendamento, remarcadoPara: novo?.slot.inicio ?? null }
    }

    private montarPagina({ linkToken, agendamento, remarcadoPara }: Validado): PaginaAgendamento {
        const ehOPaciente = linkToken.destinatarioTipo === TipoAutor.PACIENTE
        const { slot, paciente } = agendamento
        return {
            tipo: 'AGENDAMENTO',
            ubs: { nome: paciente.ubs.nome, endereco: paciente.ubs.endereco, telefone: paciente.ubs.telefone },
            inicio: slot.inicio,
            status: agendamento.status,
            tipoAtendimento: ehOPaciente ? { nome: slot.tipoAtendimento.nome, instrucoesPreparo: slot.tipoAtendimento.instrucoesPreparo } : null,
            profissional: ehOPaciente ? slot.profissional.nome : null,
            remarcadoPara,
            acoes: this.agendamentos.acoesDisponiveis(agendamento)
        }
    }
}
