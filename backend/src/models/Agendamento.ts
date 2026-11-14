import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OrigemAgendamento, StatusAgendamento, TipoAutor } from "./enums";
import { Paciente } from "./Paciente";
import { Slot } from "./Slot";

@Entity('agendamento')
// Restrição da seção 5: um slot tem no máximo 1 agendamento ativo. Índice único parcial do Postgres,
// a última barreira contra duas ofertas simultâneas aceitas ao mesmo tempo.
@Index('agendamento_slot_ativo_uq', ['slotId'], { unique: true, where: `"status" IN ('PENDENTE', 'CONFIRMADO')` })
@Index('agendamento_paciente_status_idx', ['pacienteId', 'status'])
export class Agendamento {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    pacienteId: number

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente

    @Column()
    slotId: number

    @ManyToOne(() => Slot)
    @JoinColumn({ name: 'slotId' })
    slot: Slot

    @Column({ type: 'enum', enum: StatusAgendamento, enumName: 'status_agendamento' })
    status: StatusAgendamento

    @Column({ type: 'enum', enum: OrigemAgendamento, enumName: 'origem_agendamento' })
    origem: OrigemAgendamento

    // RN-22: aponta para o agendamento antigo quando este nasceu de uma remarcação
    @Column({ type: 'int', nullable: true })
    remarcadoDeId: number | null

    @ManyToOne(() => Agendamento)
    @JoinColumn({ name: 'remarcadoDeId' })
    remarcadoDe: Agendamento | null

    @Column({ type: 'enum', enum: TipoAutor, enumName: 'tipo_autor' })
    criadoPorTipo: TipoAutor

    @Column({ type: 'int', nullable: true })
    criadoPorId: number | null

    @Column({ type: 'timestamptz', nullable: true })
    confirmadoEm: Date | null

    @Column({ type: 'timestamptz', nullable: true })
    canceladoEm: Date | null

    @Column({ type: 'enum', enum: TipoAutor, enumName: 'tipo_autor', nullable: true })
    canceladoPorTipo: TipoAutor | null

    @Column({ type: 'timestamptz', nullable: true })
    presencaRegistradaEm: Date | null

    // Acréscimo ao modelo da spec: ordenação da agenda e do histórico
    @CreateDateColumn({ type: 'timestamptz' })
    criadoEm: Date
}
