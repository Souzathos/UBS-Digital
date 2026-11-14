import { Brackets } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { AppDataSource } from "../config/dataSource";
import { ConflictError, NotFoundError } from "../errors";
import { Paciente } from "../models";
import { ConsentimentoCanais } from "../models/Paciente";
import { BuscarPacientesInput, CadastrarPacienteInput } from "../dtos/paciente";
import { gerarHash } from "../utils/hash";
import { SessaoEquipe } from "../utils/jwt";
import { gerarSenhaProvisoria } from "../utils/token";
import { ConfiguracaoService } from "./ConfiguracaoService";

export class PacienteService {
    private repo = AppDataSource.getRepository(Paciente)

    constructor(private readonly clock: Clock = relogioPadrao) {}

    // Cadastro pela recepção. Seção 6 [sugestão confirmada]: gera senha provisória, entregue uma única
    // vez na resposta; o paciente troca no primeiro acesso.
    async cadastrar(dados: CadastrarPacienteInput, sessao: SessaoEquipe) {
        if(await this.repo.existsBy({ cpf: dados.cpf })) throw new ConflictError('Já existe paciente com este CPF')

        const agora = this.clock.now().toISOString()
        // RN-80: consentimento registrado por canal, com data
        const consentimentoCanais: ConsentimentoCanais = Object.fromEntries(
            dados.consentimentoCanais.map(canal => [canal, { aceito: true, em: agora }])
        )

        const senhaProvisoria = gerarSenhaProvisoria()
        const paciente = this.repo.create({
            ubsId: sessao.ubsId,
            nome: dados.nome,
            cpf: dados.cpf,
            cns: dados.cns ?? null,
            dataNascimento: dados.dataNascimento,
            telefone: dados.telefone ?? null,
            email: dados.email ?? null,
            possuiCelular: dados.possuiCelular,
            pushToken: null,
            pontuacao: await new ConfiguracaoService().get('pontos.inicial', sessao.ubsId),
            vulneravel: false,
            consentimentoCanais,
            senhaHash: await gerarHash(senhaProvisoria),
            deveTrocarSenha: true
        })

        return { paciente: await this.repo.save(paciente), senhaProvisoria }
    }

    // Busca por nome (parcial, sem acento importar na digitação) ou por CPF, só na UBS da equipe
    async buscar({ q }: BuscarPacientesInput, sessao: SessaoEquipe) {
        const query = this.repo.createQueryBuilder('p')
            .where('p.ubsId = :ubsId', { ubsId: sessao.ubsId })
            .orderBy('p.nome', 'ASC')
            .take(50)

        if(q) {
            const termo = q.replace(/[\\%_]/g, c => `\\${c}`)
            const cpf = q.replace(/\D/g, '')
            query.andWhere(new Brackets(qb => {
                qb.where('p.nome ILIKE :nome', { nome: `%${termo}%` })
                if(cpf.length >= 3) qb.orWhere('p.cpf LIKE :cpf', { cpf: `${cpf}%` })
            }))
        }

        return query.getMany()
    }

    async obter(id: number, sessao: SessaoEquipe) {
        const paciente = await this.repo.findOneBy({ id, ubsId: sessao.ubsId })
        if(!paciente) throw new NotFoundError('Paciente não encontrado')
        return paciente
    }

    // A recepção pode redefinir a senha pelo painel: nova senha provisória, troca obrigatória de novo
    async redefinirSenha(id: number, sessao: SessaoEquipe) {
        const paciente = await this.obter(id, sessao)
        const senhaProvisoria = gerarSenhaProvisoria()

        paciente.senhaHash = await gerarHash(senhaProvisoria)
        paciente.deveTrocarSenha = true
        await this.repo.save(paciente)

        return { paciente, senhaProvisoria }
    }
}
