import { ApiErro } from '@/api/cliente'
import type { AlertasServico, AvisosServico, CompromissoServico, FichaCamada2Servico, OfertasEquipeServico, OfertasServico } from '../contratos'
import { alertasFalso, avisosFalso, compromissoFalso, fichaFalsa, ofertasEquipeFalso, ofertasFalso } from '../falsos'

// Os serviços falsos da Camada 2 precisam cumprir o mesmo contrato que a API real vai cumprir
// (o TypeScript confere a forma) e se comportar como ela: estado que muda e erro com ApiErro.

// Os falsos esperam ~300 ms para parecer rede; os testes avançam o relógio do Jest.
async function resolver<T>(p: Promise<T>): Promise<T> {
    await jest.advanceTimersByTimeAsync(400)
    return p
}

beforeEach(() => jest.useFakeTimers({ now: new Date('2026-11-14T12:00:00Z') }))
afterEach(() => jest.useRealTimers())

describe('serviços falsos da Camada 2', () => {
    it('têm o tipo das interfaces (o registro troca um pelo outro)', () => {
        const contratos: [AvisosServico, OfertasServico, CompromissoServico, OfertasEquipeServico, AlertasServico, FichaCamada2Servico] = [avisosFalso, ofertasFalso, compromissoFalso, ofertasEquipeFalso, alertasFalso, fichaFalsa]
        expect(contratos).toHaveLength(6)
    })

    it('RN-10/RN-11: avisos D-14 a D-0, pulando o que já tinha passado ao agendar', async () => {
        const r = await resolver(avisosFalso.listar({ id: 1, inicio: '2026-12-10T12:00:00Z', status: 'PENDENTE', criadoEm: '2026-11-14T12:00:00Z', confirmadoEm: null }))
        expect(r.avisos.map(a => a.etapa)).toEqual(['D14', 'D7', 'D3', 'D0'])
        expect(r.prazoResposta).not.toBeNull()

        const tarde = await resolver(avisosFalso.listar({ id: 2, inicio: '2026-11-19T12:00:00Z', status: 'PENDENTE', criadoEm: '2026-11-14T12:00:00Z', confirmadoEm: null }))
        expect(tarde.avisos.map(a => a.etapa)).toEqual(['D3', 'D0'])
    })

    it('RN-12: depois de confirmar, os avisos são só lembrete e não há prazo', async () => {
        const r = await resolver(avisosFalso.listar({ id: 3, inicio: '2026-12-10T12:00:00Z', status: 'CONFIRMADO', criadoEm: '2026-11-14T12:00:00Z', confirmadoEm: '2026-11-14T12:00:00Z' }))
        expect(r.prazoResposta).toBeNull()
        expect(r.avisos.every(a => a.estado === 'agendado' || a.estado === 'lembrete')).toBe(true)
    })

    it('RN-34/RN-35: aceitar muda a oferta; responder de novo dá 409', async () => {
        const [oferta] = await resolver(ofertasFalso.minhas())
        expect(oferta.status).toBe('PENDENTE')
        const aceita = await resolver(ofertasFalso.aceitar(oferta.id))
        expect(aceita.status).toBe('ACEITA')
        const segunda = ofertasFalso.manter(oferta.id).catch((e: ApiErro) => e)
        await jest.advanceTimersByTimeAsync(400)
        const erro = await segunda
        expect(erro).toBeInstanceOf(ApiErro)
        expect((erro as ApiErro).status).toBe(409)
    })

    it('RN-40: o compromisso nunca traz a pontuação em número', async () => {
        const c = await resolver(compromissoFalso.situacao())
        expect(Object.keys(c)).toEqual(['recebeOfertas'])
    })

    it('RN-36: entrar e sair da lista de suplentes', async () => {
        const [s] = await resolver(compromissoFalso.suplencias())
        expect((await resolver(compromissoFalso.entrarNaLista(s.tipoAtendimento.id))).ativo).toBe(true)
        expect((await resolver(compromissoFalso.sairDaLista(s.tipoAtendimento.id))).ativo).toBe(false)
    })

    it('RN-27: alerta aberto → em contato com o ACS → resolvido', async () => {
        const lista = await resolver(alertasFalso.listar())
        const aberto = lista.find(a => a.status === 'ABERTO')!
        expect((await resolver(alertasFalso.atribuirAoAcs(aberto.id))).status).toBe('EM_CONTATO')
        expect((await resolver(alertasFalso.resolver(aberto.id))).status).toBe('RESOLVIDO')
    })

    it('RN-50: o selo registra quem atribuiu', async () => {
        const selo = await resolver(fichaFalsa.definirSelo(5, true, 'Ana (recepção)'))
        expect(selo).toMatchObject({ vulneravel: true, atribuidoPor: 'Ana (recepção)' })
        expect((await resolver(fichaFalsa.selo(5, false))).vulneravel).toBe(true)
    })
})
