import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Agendamento } from "./Agendamento";
import { StatusAlerta } from "./enums";
import { Paciente } from "./Paciente";
import { Ubs } from "./Ubs";
import { UsuarioEquipe } from "./UsuarioEquipe";

// RN-27: paciente vulnerável sem resposta vira alerta para recepção e ACS
@Entity('alerta_equipe')
export class AlertaEquipe {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    ubsId: number

    @ManyToOne(() => Ubs)
    @JoinColumn({ name: 'ubsId' })
    ubs: Ubs

    @Column()
    pacienteId: number

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente

    @Column()
    agendamentoId: number

    @ManyToOne(() => Agendamento)
    @JoinColumn({ name: 'agendamentoId' })
    agendamento: Agendamento

    @Column()
    motivo: string

    @Column({ type: 'enum', enum: StatusAlerta, enumName: 'status_alerta', default: StatusAlerta.ABERTO })
    status: StatusAlerta

    @Column({ type: 'int', nullable: true })
    responsavelId: number | null

    @ManyToOne(() => UsuarioEquipe)
    @JoinColumn({ name: 'responsavelId' })
    responsavel: UsuarioEquipe | null

    @Column({ type: 'text', nullable: true })
    observacao: string | null

    // Gravado pelo service com o horário do Clock (RN-90); o default só cobre inserts manuais
    @Column({ type: 'timestamptz', default: () => 'now()' })
    criadoEm: Date

    @Column({ type: 'timestamptz', nullable: true })
    resolvidoEm: Date | null
}
