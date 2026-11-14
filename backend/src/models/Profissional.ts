import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CategoriaAtendimento } from "./enums";
import { Ubs } from "./Ubs";

@Entity('profissional')
export class Profissional {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    ubsId: number

    @ManyToOne(() => Ubs)
    @JoinColumn({ name: 'ubsId' })
    ubs: Ubs

    @Column()
    nome: string

    // médico, enfermeiro, técnico
    @Column()
    funcao: string

    // Médico atende CONSULTA; enfermagem atende PROCEDIMENTO. Os horários do profissional só
    // podem ser de tipos da mesma categoria.
    @Column({ type: 'enum', enum: CategoriaAtendimento, enumName: 'categoria_atendimento' })
    categoria: CategoriaAtendimento
}
