import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Profissional } from "./Profissional";
import { Ubs } from "./Ubs";

// Cada rua da área da UBS tem um médico de referência. Consultas médicas (categoria CONSULTA) são
// sempre com o médico da rua do paciente; procedimentos de enfermagem não dependem da rua.
// Lados de uma avenida dividida entre médicos entram como ruas separadas ("Av. Central (par)").
@Entity('rua')
@Index('rua_ubs_nome_uq', ['ubsId', 'nome'], { unique: true })
export class Rua {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    ubsId: number

    @ManyToOne(() => Ubs)
    @JoinColumn({ name: 'ubsId' })
    ubs: Ubs

    @Column()
    nome: string

    @Column()
    medicoReferenciaId: number

    @ManyToOne(() => Profissional)
    @JoinColumn({ name: 'medicoReferenciaId' })
    medicoReferencia: Profissional
}
