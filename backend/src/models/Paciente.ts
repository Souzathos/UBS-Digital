import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Canal } from "./enums";
import { Ubs } from "./Ubs";
import { UsuarioEquipe } from "./UsuarioEquipe";

// RN-80: consentimento por canal (aceito e quando)
export type ConsentimentoCanais = Partial<Record<Canal, { aceito: boolean, em: string }>>

@Entity('paciente')
export class Paciente {
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
    @Column({ length: 11 })
    cpf: string

    @Column({ type: 'varchar', length: 15, nullable: true })
    cns: string | null

    @Column({ type: 'date' })
    dataNascimento: string

    @Column({ type: 'varchar', nullable: true })
    telefone: string | null

    @Column({ type: 'varchar', nullable: true })
    email: string | null

    @Column({ default: false })
    possuiCelular: boolean

    @Column({ type: 'varchar', nullable: true })
    pushToken: string | null

    // Valor inicial vem de Configuracao (pontos.inicial), gravado por quem cria o paciente
    @Column({ type: 'int' })
    pontuacao: number

    // RN-50 a RN-52: só a equipe atribui; nunca sai no app, no link nem para o contato
    @Column({ default: false })
    vulneravel: boolean

    @Column({ type: 'int', nullable: true })
    vulneravelAtribuidoPor: number | null

    @ManyToOne(() => UsuarioEquipe)
    @JoinColumn({ name: 'vulneravelAtribuidoPor' })
    vulneravelAtribuidoPorUsuario: UsuarioEquipe | null

    @Column({ type: 'timestamptz', nullable: true })
    vulneravelEm: Date | null

    @Column({ type: 'jsonb', default: () => "'{}'" })
    consentimentoCanais: ConsentimentoCanais

    @Column({ type: 'varchar', nullable: true })
    senhaHash: string | null

    // Senha provisória gerada pela recepção: troca obrigatória no primeiro acesso (seção 6)
    @Column({ default: false })
    deveTrocarSenha: boolean
}
