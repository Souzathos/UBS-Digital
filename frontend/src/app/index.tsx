import { Redirect } from 'expo-router'

// Parte 0: ainda não há sessão nem telas reais; a entrada leva à vitrine dos componentes.
// Na Parte 1 este arquivo passa a redirecionar conforme a sessão (paciente, equipe ou login).
export default function Entrada() {
    return <Redirect href="/vitrine" />
}
