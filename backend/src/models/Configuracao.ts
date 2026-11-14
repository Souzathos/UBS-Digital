import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Ubs } from "./Ubs";

// Seção 7: padrão global (ubsId nulo) com sobrescrita por UBS. Valor guardado como JSON em texto.
@Entity('configuracao')
@Index('configuracao_global_uq', ['chave'], { unique: true, where: '"ubsId" IS NULL' })
@Index('configuracao_ubs_uq', ['chave', 'ubsId'], { unique: true, where: '"ubsId" IS NOT NULL' })
export class Configuracao {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    chave: string

    @Column({ type: 'text' })
    valor: string

    @Column({ type: 'int', nullable: true })
    ubsId: number | null

    @ManyToOne(() => Ubs)
    @JoinColumn({ name: 'ubsId' })
    ubs: Ubs | null
}
