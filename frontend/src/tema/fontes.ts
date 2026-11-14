import {
    AtkinsonHyperlegibleMono_500Medium,
    AtkinsonHyperlegibleMono_600SemiBold,
    AtkinsonHyperlegibleMono_700Bold
} from '@expo-google-fonts/atkinson-hyperlegible-mono'
import {
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
    PublicSans_800ExtraBold
} from '@expo-google-fonts/public-sans'
import type { FontFamilyDefinition } from 'expo-font'

import { familia } from './tokens'

// As fontes das telas. Cada família registra todos os seus pesos com um nome só (SDK 58), então
// os componentes usam fontFamily: 'Public Sans' + fontWeight: '700', como na web.
export const familiasDeFonte: FontFamilyDefinition[] = [
    {
        fontFamily: familia.texto,
        fontDefinitions: [
            { path: PublicSans_400Regular, weight: 400 },
            { path: PublicSans_500Medium, weight: 500 },
            { path: PublicSans_600SemiBold, weight: 600 },
            { path: PublicSans_700Bold, weight: 700 },
            { path: PublicSans_800ExtraBold, weight: 800 }
        ]
    },
    {
        fontFamily: familia.mono,
        fontDefinitions: [
            { path: AtkinsonHyperlegibleMono_500Medium, weight: 500 },
            { path: AtkinsonHyperlegibleMono_600SemiBold, weight: 600 },
            { path: AtkinsonHyperlegibleMono_700Bold, weight: 700 }
        ]
    }
]
