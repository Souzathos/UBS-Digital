import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Agendamento } from "./Agendamento";
import { Paciente } from "./Paciente";

// RN-42: toda mudança de pontuação fica registrada
@Entity('evento_pontuacao')
export class EventoPontuacao {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    pacienteId: number

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente

    @Column({ type: 'int', nullable: true })
    agendamentoId: number | null

    @ManyToOne(() => Agendamento)
    @JoinColumn({ name: 'agendamentoId' })
    agendamento: Agendamento | null

    @Column({ type: 'int' })
    delta: number

    @Column()
    motivo: string

    @Column({ type: 'int' })
    saldoApos: number

    @CreateDateColumn({ type: 'timestamptz' })
    criadoEm: Date
}
