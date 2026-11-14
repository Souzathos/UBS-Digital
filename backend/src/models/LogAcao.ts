import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Agendamento } from "./Agendamento";
import { Canal, TipoAutor } from "./enums";

// RN-82: toda ação sobre um agendamento gera log com autor, canal e horário
@Entity('log_acao')
@Index('log_acao_agendamento_idx', ['agendamentoId'])
export class LogAcao {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    agendamentoId: number

    @ManyToOne(() => Agendamento)
    @JoinColumn({ name: 'agendamentoId' })
    agendamento: Agendamento

    @Column()
    acao: string

    @Column({ type: 'enum', enum: TipoAutor, enumName: 'tipo_autor' })
    autorTipo: TipoAutor

    @Column({ type: 'int', nullable: true })
    autorId: number | null

    @Column({ type: 'enum', enum: Canal, enumName: 'canal', nullable: true })
    canal: Canal | null

    @Column({ type: 'jsonb', default: () => "'{}'" })
    detalhes: Record<string, unknown>

    // Horário vem do Clock (RN-90), por isso não é CreateDateColumn
    @Column({ type: 'timestamptz' })
    criadoEm: Date
}
