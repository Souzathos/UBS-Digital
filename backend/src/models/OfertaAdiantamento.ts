import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Agendamento } from "./Agendamento";
import { StatusOferta } from "./enums";
import { Slot } from "./Slot";
import { Suplente } from "./Suplente";

@Entity('oferta_adiantamento')
export class OfertaAdiantamento {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    slotId: number

    @ManyToOne(() => Slot)
    @JoinColumn({ name: 'slotId' })
    slot: Slot

    // RN-31 (a): candidato com agendamento ativo posterior à vaga
    @Column({ type: 'int', nullable: true })
    agendamentoCandidatoId: number | null

    @ManyToOne(() => Agendamento)
    @JoinColumn({ name: 'agendamentoCandidatoId' })
    agendamentoCandidato: Agendamento | null

    // RN-31 (b): candidato da lista de suplentes
    @Column({ type: 'int', nullable: true })
    suplenteId: number | null

    @ManyToOne(() => Suplente)
    @JoinColumn({ name: 'suplenteId' })
    suplente: Suplente | null

    @Column({ type: 'int' })
    ordem: number

    // RN-32: na faixa de menos de 24h a oferta vai para os 5 primeiros ao mesmo tempo
    @Column({ default: false })
    simultanea: boolean

    @Column({ type: 'enum', enum: StatusOferta, enumName: 'status_oferta', default: StatusOferta.PENDENTE })
    status: StatusOferta

    @Column({ type: 'timestamptz' })
    enviadaEm: Date

    @Column({ type: 'timestamptz' })
    expiraEm: Date

    @Column({ type: 'timestamptz', nullable: true })
    respondidaEm: Date | null
}
