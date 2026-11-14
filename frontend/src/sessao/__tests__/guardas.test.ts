import type { PacienteProprio, UsuarioEquipe } from '@/api/tipos'
import { calcularGuardas, destinoInicial, type Sessao } from '../guardas'

const paciente = (deveTrocarSenha: boolean): PacienteProprio => ({
    id: 1,
    ubsId: 1,
    nome: 'Osvaldo Menezes',
    cpf: '12345678909',
    cns: null,
    dataNascimento: '1950-01-01',
    rua: { id: 1, nome: 'Rua das Flores' },
    numero: '10',
    medicoReferencia: { id: 1, nome: 'Dra. Helena' },
    telefone: null,
    email: null,
    possuiCelular: true,
    consentimentoCanais: {},
    deveTrocarSenha
})

const usuario: UsuarioEquipe = { id: 1, ubsId: 1, nome: 'Ana', email: 'recepcao@ubs.local', perfil: 'RECEPCAO' }
const ubs = { id: 1, nome: 'UBS Feitoria', endereco: 'Rua da Saúde, 100', telefone: '(51) 3592-1100' }

const verdadeiras = (s: Sessao) => Object.entries(calcularGuardas(s)).filter(([, v]) => v).map(([k]) => k)

describe('guardas de rota', () => {
    it('sem login, só as telas de entrar', () => {
        expect(verdadeiras({ estado: 'anonimo' })).toEqual(['anonimo'])
        expect(destinoInicial({ estado: 'anonimo' })).toBe('/entrar')
    })

    it('senha provisória: a única tela possível é "Crie sua senha"', () => {
        const s: Sessao = { estado: 'paciente', token: 't', paciente: paciente(true), ubs }
        expect(verdadeiras(s)).toEqual(['trocarSenha'])
        expect(destinoInicial(s)).toBe('/trocar-senha')
    })

    it('paciente com senha trocada vai para a área do paciente', () => {
        const s: Sessao = { estado: 'paciente', token: 't', paciente: paciente(false), ubs }
        expect(verdadeiras(s)).toEqual(['paciente'])
        expect(destinoInicial(s)).toBe('/paciente')
    })

    it('equipe vai para o painel, e nunca para a área do paciente', () => {
        const s: Sessao = { estado: 'equipe', token: 't', usuario, ubs }
        expect(verdadeiras(s)).toEqual(['equipe'])
        expect(destinoInicial(s)).toBe('/equipe')
    })

    it('enquanto carrega ou sem conexão, nenhuma área abre', () => {
        expect(verdadeiras({ estado: 'carregando' })).toEqual([])
        expect(verdadeiras({ estado: 'semConexao' })).toEqual([])
        expect(destinoInicial({ estado: 'carregando' })).toBeNull()
    })
})
