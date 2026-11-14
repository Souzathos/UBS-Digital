import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OrigemSlot, StatusSlot } from "./enums";
import { Profissional } from "./Profissional";
import { TipoAtendimento } from "./TipoAtendimento";

@Entity('slot')
// Um profissional não tem dois slots começando no mesmo instante
@Index('slot_profissional_inicio_uq', ['profissionalId', 'inicio'], { unique: true })
@Index('slot_tipo_status_inicio_idx', ['tipoAtendimentoId', 'status', 'inicio'])
export class Slot {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    profissionalId: number

    @ManyToOne(() => Profissional)
    @JoinColumn({ name: 'profissionalId' })
    profissional: Profissional

    @Column()
    tipoAtendimentoId: number

    @ManyToOne(() => TipoAtendimento)
    @JoinColumn({ name: 'tipoAtendimentoId' })
    tipoAtendimento: TipoAtendimento

    @Column({ type: 'timestamptz' })
    inicio: Date

    @Column({ type: 'timestamptz' })
    fim: Date

    // RN-02: APP = cota reservada ao app; RECEPCAO = só a recepção enxerga
    @Column({ type: 'enum', enum: OrigemSlot, enumName: 'origem_slot' })
    origem: OrigemSlot

    @Column({ type: 'enum', enum: StatusSlot, enumName: 'status_slot', default: StatusSlot.LIVRE })
    status: StatusSlot
}
