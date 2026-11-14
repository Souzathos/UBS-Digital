// CPF: 11 dígitos, os dois últimos são verificadores

function digitoVerificador(base: string) {
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * (base.length + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
}

export function apenasDigitos(valor: string) {
    return valor.replace(/\D/g, '')
}

export function cpfValido(valor: string) {
    const cpf = apenasDigitos(valor)
    if(cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

    const d1 = digitoVerificador(cpf.slice(0, 9))
    const d2 = digitoVerificador(cpf.slice(0, 10))
    return d1 === Number(cpf[9]) && d2 === Number(cpf[10])
}

// Completa 9 dígitos com os verificadores (usado no seed e nos testes)
export function cpfComDigitos(base9: string) {
    const d1 = digitoVerificador(base9)
    const d2 = digitoVerificador(base9 + d1)
    return `${base9}${d1}${d2}`
}
