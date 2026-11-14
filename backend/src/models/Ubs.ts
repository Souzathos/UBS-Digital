import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('ubs')
export class Ubs {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    nome: string

    @Column()
    endereco: string

    @Column()
    telefone: string
}
