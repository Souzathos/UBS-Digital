import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Agendamento } from "./Agendamento";
import { Canal, EtapaNotificacao, StatusNotificacao, TipoAutor } from "./enums";
import { OfertaAdiantamento } from "./OfertaAdiantamento";

@Entity('notificacao')
// O job de lembretes busca por (status, agendadaPara)
@Index('notificacao_status_agendada_idx', ['status', 'agendadaPara'])
export class Notificacao {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'int', nullable: true })
    agendamentoId: number | null

    @ManyToOne(() => Agendamento)
    @JoinColumn({ name: 'agendamentoId' })
    agendamento: Agendamento | null

    @Column({ type: 'int', nullable: true })
    ofertaId: number | null

    @ManyToOne(() => OfertaAdiantamento)
    @JoinColumn({ name: 'ofertaId' })
    oferta: OfertaAdiantamento | null

    // paciente, contato ou equipe
    @Column({ type: 'enum', enum: TipoAutor, enumName: 'tipo_autor' })
    destinatarioTipo: TipoAutor

    @Column({ type: 'int' })
    destinatarioId: number

    @Column({ type: 'enum', enum: EtapaNotificacao, enumName: 'etapa_notificacao' })
    etapa: EtapaNotificacao

    @Column({ type: 'enum', enum: Canal, enumName: 'canal' })
    canal: Canal

    @Column({ type: 'enum', enum: StatusNotificacao, enumName: 'status_notificacao', default: StatusNotificacao.AGENDADA })
    status: StatusNotificacao

    @Column({ type: 'timestamptz' })
    agendadaPara: Date

    @Column({ type: 'timestamptz', nullable: true })
    enviadaEm: Date | null

    @Column({ type: 'timestamptz', nullable: true })
    respondidaEm: Date | null

    @Column({ type: 'int', default: 0 })
    tentativa: number
}
