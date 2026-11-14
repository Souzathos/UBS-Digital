import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Agendamento } from "./Agendamento";
import { TipoAutor } from "./enums";
import { OfertaAdiantamento } from "./OfertaAdiantamento";

// RN-70: o banco guarda só o hash; o token em si vai na URL da mensagem
@Entity('link_token')
export class LinkToken {
    @PrimaryGeneratedColumn()
    id: number

    @Index({ unique: true })
    @Column({ length: 64 })
    tokenHash: string

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

    @Column({ type: 'enum', enum: TipoAutor, enumName: 'tipo_autor' })
    destinatarioTipo: TipoAutor

    @Column({ type: 'int' })
    destinatarioId: number

    // RN-70: expira no horário da consulta
    @Column({ type: 'timestamptz' })
    expiraEm: Date

    @Column({ type: 'timestamptz', nullable: true })
    usadoEm: Date | null
}
