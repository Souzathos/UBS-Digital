import { View } from 'react-native'

import type { PacienteProprio } from '@/api/tipos'
import { useTheme } from '@/tema/ThemeProvider'
import { Aviso } from './Aviso'
import { Icone } from './Icone'
import { Texto } from './Texto'

// "Seu médico: Dra. Helena (pela sua rua)" (RN-06). Sem rua cadastrada, orienta a procurar a
// recepção: sem rua não há médico de referência e a API recusa consulta médica.
export function CartaoMedico({ paciente }: { paciente: PacienteProprio }) {
    const { cores, raio, fonte } = useTheme()

    if (!paciente.medicoReferencia) {
        return (
            <Aviso tipo="aviso" titulo="Sem endereço cadastrado">
                Para marcar consulta com o médico, a recepção precisa cadastrar a sua rua. Os procedimentos de enfermagem continuam liberados.
            </Aviso>
        )
    }

    return (
        <View
            accessible
            accessibilityLabel={`Seu médico: ${paciente.medicoReferencia.nome}, pela sua rua. ${paciente.rua?.nome ?? ''}. Mudou de endereço? Avise a recepção.`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: raio.md, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.superficie }}
        >
            <View style={{ width: 40, height: 40, borderRadius: raio.md, backgroundColor: cores.destaqueSuave, alignItems: 'center', justifyContent: 'center' }}>
                <Icone nome="medico" cor={cores.link} tamanho={22} traco={1.9} />
            </View>
            <View style={{ flex: 1 }}>
                <Texto variante="corpoForte">Seu médico: {paciente.medicoReferencia.nome} (pela sua rua)</Texto>
                <Texto variante="legenda" cor="textoSuave" style={{ fontSize: fonte(13) }}>
                    {paciente.rua?.nome}. Mudou de endereço? Avise a recepção.
                </Texto>
            </View>
        </View>
    )
}
