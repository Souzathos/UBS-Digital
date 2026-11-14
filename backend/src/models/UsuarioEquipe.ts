import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PerfilEquipe } from "./enums";
import { Ubs } from "./Ubs";

@Entity('usuario_equipe')
export class UsuarioEquipe {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    ubsId: number

    @ManyToOne(() => Ubs)
    @JoinColumn({ name: 'ubsId' })
    ubs: Ubs

    @Column()
    nome: string

    @Index({ unique: true })
    @Column()
    email: string

    @Column()
    senhaHash: string

    @Column({ type: 'enum', enum: PerfilEquipe, enumName: 'perfil_equipe' })
    perfil: PerfilEquipe
}
