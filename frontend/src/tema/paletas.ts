// As três paletas do app com os mesmos nomes semânticos. As telas nunca usam um hexadecimal
// direto: pedem `cores.texto`, `cores.perigo`, etc., e a paleta certa vem do tema.
//
// - claro: app do paciente (telas paciente/ do design)
// - escuro: painel da equipe, azul-marinho (telas equipe/ do design)
// - altoContraste: fundo preto e letras brancas, com amarelo para destaque (menu de acessibilidade)

export type CoresEtiqueta = { fundo: string; tinta: string; borda: string }

// Chaves visuais dos status. O texto de cada status mora em utils/rotulos.ts (status sempre escrito).
export type ChaveStatus = 'confirmado' | 'pendente' | 'remarcado' | 'cancelado' | 'compareceu' | 'faltou'

export type Paleta = {
    escuro: boolean
    fundo: string
    superficie: string
    superficieSuave: string
    texto: string
    textoSuave: string
    borda: string
    bordaForte: string
    link: string
    primario: string
    sobrePrimario: string
    destaque: string
    destaqueSuave: string
    sucesso: string
    sobreSucesso: string
    aviso: string
    sobreAviso: string
    perigo: string
    sobrePerigo: string
    foco: string
    sobreposicao: string
    etiquetaMedico: CoresEtiqueta
    etiquetaEnfermagem: CoresEtiqueta
    status: Record<ChaveStatus, CoresEtiqueta>
    abaAtiva: string
    abaAtivaFundo: string
    abaInativa: string
    barraAbas: string
}

const AZUL = '#082C63'
const BRANCO = '#FFFFFF'

export const claro: Paleta = {
    escuro: false,
    fundo: '#F1F5FA',
    superficie: BRANCO,
    superficieSuave: '#F8FAFD',
    texto: AZUL,
    textoSuave: '#41536F',
    borda: '#DCE5F0',
    bordaForte: '#C3CFDF',
    link: '#0A5FB4',
    primario: AZUL,
    sobrePrimario: BRANCO,
    destaque: '#82CBF6',
    destaqueSuave: '#E4F1FC',
    sucesso: '#167A3E',
    sobreSucesso: BRANCO,
    aviso: '#FEC301',
    sobreAviso: AZUL,
    perigo: '#B31400',
    sobrePerigo: BRANCO,
    foco: '#0A5FB4',
    sobreposicao: 'rgba(8, 44, 99, 0.45)',
    etiquetaMedico: { fundo: AZUL, tinta: BRANCO, borda: AZUL },
    etiquetaEnfermagem: { fundo: '#E4F1FC', tinta: AZUL, borda: '#0A5FB4' },
    status: {
        confirmado: { fundo: '#167A3E', tinta: BRANCO, borda: '#167A3E' },
        pendente: { fundo: '#FEC301', tinta: AZUL, borda: '#FEC301' },
        remarcado: { fundo: BRANCO, tinta: AZUL, borda: AZUL },
        cancelado: { fundo: BRANCO, tinta: AZUL, borda: AZUL },
        compareceu: { fundo: '#E3F4E8', tinta: '#0E5A2C', borda: '#167A3E' },
        faltou: { fundo: BRANCO, tinta: '#B31400', borda: '#B31400' }
    },
    abaAtiva: AZUL,
    abaAtivaFundo: '#BFE3FA',
    abaInativa: '#4F5F78',
    barraAbas: BRANCO
}

const CLARO_EQUIPE = '#F2F7FD'
const FUNDO_EQUIPE = '#061A3D'

export const escuro: Paleta = {
    escuro: true,
    fundo: FUNDO_EQUIPE,
    superficie: '#0C2A5A',
    superficieSuave: '#0C2A5A',
    texto: CLARO_EQUIPE,
    textoSuave: '#B5C8E2',
    borda: '#1F4177',
    bordaForte: '#4D6FA3',
    link: '#7CC4F5',
    primario: CLARO_EQUIPE,
    sobrePrimario: FUNDO_EQUIPE,
    destaque: '#82CBF6',
    destaqueSuave: '#123B73',
    sucesso: '#82CBF6',
    sobreSucesso: FUNDO_EQUIPE,
    aviso: '#FEC301',
    sobreAviso: FUNDO_EQUIPE,
    // As telas da equipe não trazem vermelho; este tom claro mantém contraste AA sobre o azul-marinho.
    perigo: '#FFB4A8',
    sobrePerigo: FUNDO_EQUIPE,
    foco: '#7CC4F5',
    sobreposicao: 'rgba(0, 0, 0, 0.55)',
    etiquetaMedico: { fundo: CLARO_EQUIPE, tinta: FUNDO_EQUIPE, borda: CLARO_EQUIPE },
    etiquetaEnfermagem: { fundo: 'transparent', tinta: '#CDE6FB', borda: '#7CC4F5' },
    status: {
        confirmado: { fundo: '#123B73', tinta: '#CDE6FB', borda: '#123B73' },
        pendente: { fundo: '#FEC301', tinta: FUNDO_EQUIPE, borda: '#FEC301' },
        remarcado: { fundo: 'transparent', tinta: CLARO_EQUIPE, borda: '#B5C8E2' },
        cancelado: { fundo: 'transparent', tinta: CLARO_EQUIPE, borda: '#B5C8E2' },
        compareceu: { fundo: '#82CBF6', tinta: FUNDO_EQUIPE, borda: '#82CBF6' },
        faltou: { fundo: 'transparent', tinta: CLARO_EQUIPE, borda: '#B5C8E2' }
    },
    abaAtiva: CLARO_EQUIPE,
    abaAtivaFundo: '#14498F',
    abaInativa: '#B5C8E2',
    barraAbas: FUNDO_EQUIPE
}

const PRETO = '#000000'
const AMARELO = '#FFE14D'
const CHIP_BRANCO: CoresEtiqueta = { fundo: BRANCO, tinta: PRETO, borda: BRANCO }
const CHIP_CONTORNO: CoresEtiqueta = { fundo: PRETO, tinta: BRANCO, borda: BRANCO }

export const altoContraste: Paleta = {
    escuro: true,
    fundo: PRETO,
    superficie: PRETO,
    superficieSuave: PRETO,
    texto: BRANCO,
    textoSuave: BRANCO,
    borda: BRANCO,
    bordaForte: BRANCO,
    link: AMARELO,
    primario: BRANCO,
    sobrePrimario: PRETO,
    destaque: AMARELO,
    destaqueSuave: PRETO,
    sucesso: AMARELO,
    sobreSucesso: PRETO,
    aviso: AMARELO,
    sobreAviso: PRETO,
    perigo: BRANCO,
    sobrePerigo: PRETO,
    foco: AMARELO,
    sobreposicao: 'rgba(0, 0, 0, 0.8)',
    etiquetaMedico: CHIP_BRANCO,
    etiquetaEnfermagem: CHIP_CONTORNO,
    status: {
        confirmado: CHIP_BRANCO,
        pendente: { fundo: AMARELO, tinta: PRETO, borda: AMARELO },
        remarcado: CHIP_CONTORNO,
        cancelado: CHIP_CONTORNO,
        compareceu: CHIP_BRANCO,
        faltou: CHIP_CONTORNO
    },
    abaAtiva: PRETO,
    abaAtivaFundo: AMARELO,
    abaInativa: BRANCO,
    barraAbas: PRETO
}
