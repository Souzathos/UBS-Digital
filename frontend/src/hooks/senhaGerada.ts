// A senha provisória aparece uma vez só (resposta do POST /pacientes ou do redefinir-senha). Para
// não passar a senha pela URL (que fica no histórico do navegador e nos logs), a tela que recebeu
// a resposta guarda aqui, em memória, e a tela "Senha provisória gerada" lê e apaga.

type SenhaGerada = { pacienteId: number; nome: string; cpf: string; senha: string; endereco: string; medico: string | null; novo: boolean }

let guardada: SenhaGerada | null = null

export function guardarSenhaGerada(dados: SenhaGerada) {
    guardada = dados
}

export function lerSenhaGerada(): SenhaGerada | null {
    const dados = guardada
    guardada = null
    return dados
}
