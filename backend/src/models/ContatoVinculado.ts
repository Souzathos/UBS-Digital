import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Paciente } from "./Paciente";

@Entity('contato_vinculado')
export class ContatoVinculado {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    pacienteId: number

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente

    @Column()
    nome: string

    // pai, mãe, filho, cônjuge, outro parente, vizinho, amigo, outro
    @Column()
    relacao: string

    @Column({ type: 'varchar', nullable: true })
    telefone: string | null

    @Column({ type: 'varchar', nullable: true })
    email: string | null

    // Quando o contato também usa o app, com a própria conta de paciente
    @Column({ type: 'int', nullable: true })
    contaPacienteId: number | null

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'contaPacienteId' })
    contaPaciente: Paciente | null

    // RN-56
    @Column({ default: false })
    recebeNotificacoes: boolean

    // RN-55 / RN-80: consentimento do paciente (data e forma)
    @Column({ type: 'timestamptz' })
    consentimentoEm: Date

    @Column()
    consentimentoForma: string

    @Column({ default: true })
    ativo: boolean
}
