import { AppDataSource } from "../config/dataSource";
import { Profissional, TipoAtendimento, TipoAutor } from "../models";
import { Sessao } from "../utils/jwt";

export class CatalogoService {
    // RN-01: o paciente só vê os tipos que pode agendar pelo app; a equipe vê todos
    async listarTipos(sessao: Sessao) {
        return AppDataSource.getRepository(TipoAtendimento).find({
            where: sessao.tipo === TipoAutor.PACIENTE
                ? { ubsId: sessao.ubsId, permiteAgendamentoApp: true }
                : { ubsId: sessao.ubsId },
            order: { nome: 'ASC' }
        })
    }

    async listarProfissionais(sessao: Sessao) {
        return AppDataSource.getRepository(Profissional).find({ where: { ubsId: sessao.ubsId }, order: { nome: 'ASC' } })
    }
}
