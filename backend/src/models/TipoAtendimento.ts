import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CategoriaAtendimento } from "./enums";
import { Ubs } from "./Ubs";

@Entity('tipo_atendimento')
export class TipoAtendimento {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    ubsId: number

    @ManyToOne(() => Ubs)
    @JoinColumn({ name: 'ubsId' })
    ubs: Ubs

    @Column()
    nome: string

    @Column({ type: 'enum', enum: CategoriaAtendimento, enumName: 'categoria_atendimento' })
    categoria: CategoriaAtendimento

    @Column({ type: 'int' })
    duracaoMin: number

    // RN-03: antecedência máxima por tipo (fica aqui, não na tabela Configuracao)
    @Column({ type: 'int' })
    antecedenciaMaximaDias: number

    // RN-01: o paciente só agenda pelo app os tipos liberados
    @Column({ default: false })
    permiteAgendamentoApp: boolean

    // RN-13: vai em todos os lembretes quando existir
    @Column({ type: 'text', nullable: true })
    instrucoesPreparo: string | null
}
