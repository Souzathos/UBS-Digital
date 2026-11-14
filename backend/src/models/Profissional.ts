import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
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

    // médico, enfermeiro, dentista, técnico
    @Column()
    funcao: string
}
