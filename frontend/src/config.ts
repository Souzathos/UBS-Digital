// Configuração do app vinda do ambiente (.env, prefixo EXPO_PUBLIC_). O Expo troca cada
// process.env.EXPO_PUBLIC_X pelo valor na hora de montar o app, por isso o acesso é sempre direto.

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333').replace(/\/$/, '')

// Nome da UBS antes do login (tela Entrar). Depois do login, o nome vem da sessão (campo `ubs`
// do login e de /auth/eu; ver useNomeUbs). A rede aparece embaixo, como nas telas.
export const UBS_NOME = 'UBS Feitoria'
export const REDE_NOME = 'UBS São Leopoldo'

// Marca (assets/imagens): logo completa "UBS São Leopoldo · Agora é Digital" e só o símbolo.
export const LOGO_COMPLETA = require('../assets/imagens/logo-completa.png')
export const LOGO_SIMBOLO = require('../assets/imagens/logo-simbolo.png')
export const NOME_MARCA = 'UBS São Leopoldo, agora é digital'
