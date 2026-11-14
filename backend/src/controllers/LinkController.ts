import { Request, Response } from "express";
import { AppError } from "../errors";
import { EstadoLink, LinkService } from "../services/LinkService";
import { Aviso, paginaAgendamento, paginaConfirmarCancelamento } from "../web/templates/agendamento";
import { paginaLinkExpirado } from "../web/templates/estado";
import { paginaRemarcar } from "../web/templates/remarcar";

const AVISOS: Aviso[] = ['confirmado', 'cancelado', 'remarcado']

// Página do link (RN-70 a RN-73). Só HTML: GET mostra, POST age e redireciona (PRG), para que
// atualizar a página não repita a ação.
export class LinkController {
    private service = new LinkService()

    private base(req: Request) {
        return `/l/${encodeURIComponent(String(req.params.token))}`
    }

    private renderEstado(res: Response, estado: EstadoLink, req: Request, opcoes: { aviso?: Aviso | null, erro?: string | null } = {}, status = 200) {
        if(estado.tipo === 'INVALIDO') return res.status(404).type('html').send(paginaLinkExpirado(false))
        if(estado.tipo === 'EXPIRADO') return res.status(410).type('html').send(paginaLinkExpirado(true))
        return res.status(status).type('html').send(paginaAgendamento(this.base(req), estado, opcoes))
    }

    async abrir(req: Request, res: Response) {
        const aviso = AVISOS.find(a => a === req.query.ok) ?? null
        return this.renderEstado(res, await this.service.abrir(String(req.params.token)), req, { aviso })
    }

    async telaCancelar(req: Request, res: Response) {
        const estado = await this.service.abrir(String(req.params.token))
        if(estado.tipo !== 'AGENDAMENTO' || !estado.acoes.cancelar) return this.renderEstado(res, estado, req)
        return res.status(200).type('html').send(paginaConfirmarCancelamento(this.base(req), estado))
    }

    async telaRemarcar(req: Request, res: Response) {
        const { estado, horarios } = await this.service.horariosParaRemarcar(String(req.params.token))
        if(estado.tipo !== 'AGENDAMENTO' || !estado.acoes.remarcar) return this.renderEstado(res, estado, req)
        return res.status(200).type('html').send(paginaRemarcar(this.base(req), estado, horarios))
    }

    async confirmar(req: Request, res: Response) {
        return this.agir(req, res, 'confirmado', () => this.service.confirmar(String(req.params.token)))
    }

    async cancelar(req: Request, res: Response) {
        return this.agir(req, res, 'cancelado', () => this.service.cancelar(String(req.params.token)))
    }

    async remarcar(req: Request, res: Response) {
        const slotId = Number(req.body?.slotId)
        if(!Number.isSafeInteger(slotId) || slotId <= 0) return this.renderEstado(res, await this.service.abrir(String(req.params.token)), req, { erro: 'Escolha um horário da lista' }, 400)
        return this.agir(req, res, 'remarcado', () => this.service.remarcar(String(req.params.token), slotId))
    }

    private async agir(req: Request, res: Response, aviso: Aviso, acao: () => Promise<EstadoLink | null>) {
        try {
            const falha = await acao()
            if(falha) return this.renderEstado(res, falha, req)
            return res.redirect(303, `${this.base(req)}?ok=${aviso}`)
        } catch(error) {
            // Erro de regra (ex.: horário ocupado): mostra a mensagem junto com o estado atual
            if(!(error instanceof AppError)) throw error
            return this.renderEstado(res, await this.service.abrir(String(req.params.token)), req, { erro: error.message }, error.statusCode)
        }
    }
}
