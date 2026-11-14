import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native'

import { useTheme, type Tema } from './ThemeProvider'

// Único jeito de estilizar um componente. Recebe uma função do tema e devolve um hook:
//
//   const useEstilos = criarEstilos(t => ({ caixa: { backgroundColor: t.cores.superficie } }))
//   function Componente() { const e = useEstilos(); return <View style={e.caixa} /> }
//
// O StyleSheet é criado uma vez por tema (o tema é sempre a mesma referência, ver obterTema) e
// reaproveitado por todas as instâncias do componente.

type Estilos = { [nome: string]: ViewStyle | TextStyle | ImageStyle }

// O `& Estilos` no retorno da fábrica faz o TypeScript tipar os literais ('row', 'center') na
// hora, em vez de alargá-los para string (mesmo truque da assinatura do StyleSheet.create).
export function criarEstilos<S extends Estilos>(fabrica: (tema: Tema) => S & Estilos) {
    const porTema = new WeakMap<Tema, Readonly<S>>()
    return function useEstilos(): Readonly<S> {
        const tema = useTheme()
        let estilos = porTema.get(tema)
        if (!estilos) {
            estilos = StyleSheet.create(fabrica(tema)) as Readonly<S>
            porTema.set(tema, estilos)
        }
        return estilos
    }
}
