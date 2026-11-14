// Valores que não mudam com a paleta: espaços, raios, fontes e a escala tipográfica.
// Tirados das telas do Claude Design (frontend/design/), que usam múltiplos de 2 e 4 px.

export const espaco = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32
} as const

export const raio = {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 22,
    pilula: 24
} as const

// Nomes registrados no useFonts do layout raiz. Cada família tem vários pesos sob o mesmo nome
// (recurso do SDK 58), então o peso é escolhido com fontWeight.
export const familia = {
    texto: 'Public Sans',
    mono: 'Atkinson Mono'
} as const

export type Peso = '400' | '500' | '600' | '700' | '800'

// Estilos de texto usados nas telas. `tamanho` é o valor no tamanho de letra "Normal";
// a escala de acessibilidade multiplica esse valor (ver ThemeProvider).
export const tipografia = {
    titulo: { tamanho: 28, altura: 1.1, peso: '600' },
    dataGrande: { tamanho: 28, altura: 1.1, peso: '700' },
    subtitulo: { tamanho: 18, altura: 1.25, peso: '600' },
    corpo: { tamanho: 15, altura: 1.35, peso: '400' },
    corpoForte: { tamanho: 16, altura: 1.3, peso: '600' },
    secao: { tamanho: 15, altura: 1.3, peso: '600' },
    rotulo: { tamanho: 13, altura: 1.25, peso: '600' },
    legenda: { tamanho: 13, altura: 1.3, peso: '400' },
    botao: { tamanho: 17, altura: 1.2, peso: '600' },
    botaoGrande: { tamanho: 20, altura: 1.2, peso: '700' },
    mono: { tamanho: 15, altura: 1.3, peso: '600' }
} as const satisfies Record<string, { tamanho: number; altura: number; peso: Peso }>

export type VarianteTexto = keyof typeof tipografia

// Escala do menu de acessibilidade (Normal, Grande, Muito grande), igual ao protótipo.
export const escalaLetra = {
    normal: 1,
    grande: 1.2,
    muitoGrande: 1.4
} as const

export type TamanhoLetra = keyof typeof escalaLetra

// Área mínima de toque (handoff, seção 3).
export const areaToque = 48
