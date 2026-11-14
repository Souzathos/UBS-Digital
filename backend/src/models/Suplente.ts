import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Paciente } from "./Paciente";
import { TipoAtendimento } from "./TipoAtendimento";

// RN-36: "quero ser avisado se abrir vaga antes"
@Entity('suplente')
export class Suplente {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    pacienteId: number

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente

    @Column()
    tipoAtendimentoId: number

    @ManyToOne(() => TipoAtendimento)
    @JoinColumn({ name: 'tipoAtendimentoId' })
    tipoAtendimento: TipoAtendimento

    @Column({ type: 'timestamptz' })
    entrouEm: Date

    @Column({ default: true })
    ativo: boolean
}
