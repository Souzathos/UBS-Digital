import { Brackets } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { AppDataSource } from "../config/dataSource";
import { BadRequestError, ConflictError, NotFoundError } from "../errors";
import { Canal, Paciente, Rua } from "../models";
import { ConsentimentoCanais } from "../models/Paciente";
import { AtualizarCanaisInput, AtualizarEnderecoInput, BuscarPacientesInput, CadastrarPacienteInput, AtualizarPushTokenInput } from "../dtos/paciente";
import { gerarHash } from "../utils/hash";
import { SessaoEquipe, SessaoPaciente } from "../utils/jwt";
import { gerarSenhaProvisoria } from "../utils/token";
import { ConfiguracaoService } from "./ConfiguracaoService";

// O paciente sempre volta com a rua e o médico de referência (telas "Seu médico", cadastro, ficha)
export const RELACOES_PACIENTE = { rua: { medicoReferencia: true } } as const

export class PacienteService {
    private repo = AppDataSource.getRepository(Paciente)

    constructor(private readonly clock: Clock = relogioPadrao) {}

    // Cadastro pela recepção. Seção 6 [sugestão confirmada]: gera senha provisória, entregue uma única
    // vez na resposta; o paciente troca no primeiro acesso.
    async cadastrar(dados: CadastrarPacienteInput, sessao: SessaoEquipe) {
        if(await this.repo.existsBy({ cpf: dados.cpf })) throw new ConflictError('Já existe paciente com este CPF')
        await this.validarRua(dados.ruaId, sessao.ubsId)

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
            ruaId: dados.ruaId,
            numero: dados.numero,
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

        const salvo = await this.repo.save(paciente)
        return { paciente: await this.carregar(salvo.id), senhaProvisoria }
    }

    // Busca por nome (parcial, sem acento importar na digitação) ou por CPF, só na UBS da equipe
    async buscar({ q }: BuscarPacientesInput, sessao: SessaoEquipe) {
        const query = this.repo.createQueryBuilder('p')
            .leftJoinAndSelect('p.rua', 'rua')
            .leftJoinAndSelect('rua.medicoReferencia', 'medico')
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
        const paciente = await this.repo.findOne({ where: { id, ubsId: sessao.ubsId }, relations: RELACOES_PACIENTE })
        if(!paciente) throw new NotFoundError('Paciente não encontrado')
        return paciente
    }

    async carregar(id: number) {
        return this.repo.findOneOrFail({ where: { id }, relations: RELACOES_PACIENTE })
    }

    // "Mudou de endereço? Avise a recepção": a rua nova troca o médico de referência das próximas consultas
    async atualizarEndereco(id: number, { ruaId, numero }: AtualizarEnderecoInput, sessao: SessaoEquipe) {
        const paciente = await this.obter(id, sessao)
        await this.validarRua(ruaId, sessao.ubsId)
        await this.repo.update({ id: paciente.id }, { ruaId, numero })
        return this.carregar(paciente.id)
    }

    // RN-80: o paciente liga e desliga cada canal no Perfil. Mantém a data de quem já tinha aceitado e
    // registra a data da recusa de quem desligou.
    // RN-60: guarda o token de push do aparelho. O push só é usado se o canal não estiver desligado no
    // Perfil (RN-80, ver Despachante). Um token só fica com um paciente: no mesmo celular, quem entra
    // por último recebe.
    async atualizarPushToken(sessao: SessaoPaciente, { token }: AtualizarPushTokenInput) {
        if(token) await this.repo.update({ pushToken: token }, { pushToken: null })
        await this.repo.update({ id: sessao.id }, { pushToken: token })
    }

    async atualizarCanais(sessao: SessaoPaciente, { canais }: AtualizarCanaisInput) {
        const paciente = await this.carregar(sessao.id)
        const agora = this.clock.now().toISOString()
        const atual = paciente.consentimentoCanais ?? {}
        const novo: ConsentimentoCanais = {}

        for(const canal of Object.values(Canal)) {
            const antes = atual[canal]
            // Canal fora da lista fica registrado como recusado, mesmo sem registro anterior (ex.: push,
            // que antes dependia só do app instalado)
            if(canais.includes(canal)) novo[canal] = antes?.aceito ? antes : { aceito: true, em: agora }
            else novo[canal] = antes && !antes.aceito ? antes : { aceito: false, em: agora }
        }

        await this.repo.update({ id: paciente.id }, { consentimentoCanais: novo })
        return this.carregar(paciente.id)
    }

    private async validarRua(ruaId: number, ubsId: number) {
        if(!await this.repo.manager.getRepository(Rua).existsBy({ id: ruaId, ubsId })) throw new BadRequestError('Rua não encontrada nesta UBS')
    }

    // A recepção pode redefinir a senha pelo painel: nova senha provisória, troca obrigatória de novo
    async redefinirSenha(id: number, sessao: SessaoEquipe) {
        const paciente = await this.obter(id, sessao)
        const senhaProvisoria = gerarSenhaProvisoria()

        paciente.senhaHash = await gerarHash(senhaProvisoria)
        paciente.deveTrocarSenha = true
        await this.repo.save(paciente)

        return { paciente: await this.carregar(paciente.id), senhaProvisoria }
    }
}
