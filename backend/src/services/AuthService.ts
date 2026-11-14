import { AppDataSource } from "../config/dataSource";
import { NotFoundError, UnauthorizedError } from "../errors";
import { Paciente, TipoAutor, UsuarioEquipe } from "../models";
import { EntrarEquipeInput, EntrarPacienteInput, TrocarSenhaInput } from "../dtos/auth";
import { compararHash, gerarHash } from "../utils/hash";
import { gerarToken, Sessao, SessaoPaciente } from "../utils/jwt";

export class AuthService {
    private equipeRepo = AppDataSource.getRepository(UsuarioEquipe)
    private pacienteRepo = AppDataSource.getRepository(Paciente)

    async entrarEquipe({ email, senha }: EntrarEquipeInput) {
        const usuario = await this.equipeRepo.findOneBy({ email })
        // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta
        if(!usuario || !await compararHash(senha, usuario.senhaHash)) throw new UnauthorizedError('E-mail ou senha inválidos')

        const token = gerarToken({ tipo: TipoAutor.EQUIPE, id: usuario.id, ubsId: usuario.ubsId, perfil: usuario.perfil })
        return { token, usuario }
    }

    // Seção 6: paciente entra com CPF + senha
    async entrarPaciente({ cpf, senha }: EntrarPacienteInput) {
        const paciente = await this.pacienteRepo.findOneBy({ cpf })
        if(!paciente?.senhaHash || !await compararHash(senha, paciente.senhaHash)) throw new UnauthorizedError('CPF ou senha inválidos')

        return { token: this.tokenPaciente(paciente), paciente }
    }

    // Senha provisória: a troca é obrigatória no primeiro acesso e devolve um token já liberado
    async trocarSenhaPaciente(sessao: SessaoPaciente, { senhaAtual, novaSenha }: TrocarSenhaInput) {
        const paciente = await this.pacienteRepo.findOneBy({ id: sessao.id })
        if(!paciente?.senhaHash) throw new NotFoundError('Paciente não encontrado')
        if(!await compararHash(senhaAtual, paciente.senhaHash)) throw new UnauthorizedError('Senha atual incorreta')

        paciente.senhaHash = await gerarHash(novaSenha)
        paciente.deveTrocarSenha = false
        await this.pacienteRepo.save(paciente)

        return { token: this.tokenPaciente(paciente), paciente }
    }

    async eu(sessao: Sessao) {
        if(sessao.tipo === TipoAutor.EQUIPE) {
            const usuario = await this.equipeRepo.findOneBy({ id: sessao.id })
            if(!usuario) throw new UnauthorizedError('Usuário não existe mais')
            return { tipo: TipoAutor.EQUIPE as const, usuario }
        }

        const paciente = await this.pacienteRepo.findOneBy({ id: sessao.id })
        if(!paciente) throw new UnauthorizedError('Paciente não existe mais')
        return { tipo: TipoAutor.PACIENTE as const, paciente }
    }

    private tokenPaciente(paciente: Paciente) {
        return gerarToken({ tipo: TipoAutor.PACIENTE, id: paciente.id, ubsId: paciente.ubsId, deveTrocarSenha: paciente.deveTrocarSenha })
    }
}
