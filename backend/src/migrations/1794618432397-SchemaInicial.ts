import { MigrationInterface, QueryRunner } from "typeorm";

// Schema inicial: as 16 entidades da seção 5 da spec.
// Gerada por "npm run migration:generate" e editada à mão só para remover os CREATE/DROP TYPE repetidos
// que o TypeORM emite para enums compartilhados entre tabelas (tipo_autor, canal).
// Restrições importantes aqui: agendamento_slot_ativo_uq (1 agendamento ativo por slot),
// configuracao_global_uq / configuracao_ubs_uq (uma chave por escopo), slot_profissional_inicio_uq.
export class SchemaInicial1794618432397 implements MigrationInterface {
    name = 'SchemaInicial1794618432397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ubs" ("id" SERIAL NOT NULL, "nome" character varying NOT NULL, "endereco" character varying NOT NULL, "telefone" character varying NOT NULL, CONSTRAINT "PK_4b2e64bcf8f47efe7ccf173af9f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."perfil_equipe" AS ENUM('RECEPCAO', 'ACS', 'GESTOR')`);
        await queryRunner.query(`CREATE TABLE "usuario_equipe" ("id" SERIAL NOT NULL, "ubsId" integer NOT NULL, "nome" character varying NOT NULL, "email" character varying NOT NULL, "senhaHash" character varying NOT NULL, "perfil" "public"."perfil_equipe" NOT NULL, CONSTRAINT "PK_711ac7923697fd17ebfe4cfe530" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fc0db4ded5059d50ab6b10b407" ON "usuario_equipe"  ("email") `);
        await queryRunner.query(`CREATE TABLE "paciente" ("id" SERIAL NOT NULL, "ubsId" integer NOT NULL, "nome" character varying NOT NULL, "cpf" character varying(11) NOT NULL, "cns" character varying(15), "dataNascimento" date NOT NULL, "telefone" character varying, "email" character varying, "possuiCelular" boolean NOT NULL DEFAULT false, "pushToken" character varying, "pontuacao" integer NOT NULL, "vulneravel" boolean NOT NULL DEFAULT false, "vulneravelAtribuidoPor" integer, "vulneravelEm" TIMESTAMP WITH TIME ZONE, "consentimentoCanais" jsonb NOT NULL DEFAULT '{}', "senhaHash" character varying, "deveTrocarSenha" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_cbcb7985432e4b49d32c5243867" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8eb9dba1cf8f89575da9a5cb6d" ON "paciente"  ("cpf") `);
        await queryRunner.query(`CREATE TABLE "profissional" ("id" SERIAL NOT NULL, "ubsId" integer NOT NULL, "nome" character varying NOT NULL, "funcao" character varying NOT NULL, CONSTRAINT "PK_2e385f6afaa389d36d3d718536f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."categoria_atendimento" AS ENUM('CONSULTA', 'EXAME')`);
        await queryRunner.query(`CREATE TABLE "tipo_atendimento" ("id" SERIAL NOT NULL, "ubsId" integer NOT NULL, "nome" character varying NOT NULL, "categoria" "public"."categoria_atendimento" NOT NULL, "duracaoMin" integer NOT NULL, "antecedenciaMaximaDias" integer NOT NULL, "permiteAgendamentoApp" boolean NOT NULL DEFAULT false, "instrucoesPreparo" text, CONSTRAINT "PK_37af7c0d7888c71d3cf39539356" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."origem_slot" AS ENUM('RECEPCAO', 'APP')`);
        await queryRunner.query(`CREATE TYPE "public"."status_slot" AS ENUM('LIVRE', 'OCUPADO', 'BLOQUEADO')`);
        await queryRunner.query(`CREATE TABLE "slot" ("id" SERIAL NOT NULL, "profissionalId" integer NOT NULL, "tipoAtendimentoId" integer NOT NULL, "inicio" TIMESTAMP WITH TIME ZONE NOT NULL, "fim" TIMESTAMP WITH TIME ZONE NOT NULL, "origem" "public"."origem_slot" NOT NULL, "status" "public"."status_slot" NOT NULL DEFAULT 'LIVRE', CONSTRAINT "PK_5b1f733c4ba831a51f3c114607b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "slot_tipo_status_inicio_idx" ON "slot"  ("tipoAtendimentoId", "status", "inicio") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "slot_profissional_inicio_uq" ON "slot"  ("profissionalId", "inicio") `);
        await queryRunner.query(`CREATE TYPE "public"."status_agendamento" AS ENUM('PENDENTE', 'CONFIRMADO', 'CANCELADO_PACIENTE', 'CANCELADO_AUTO', 'REMARCADO', 'COMPARECEU', 'FALTOU')`);
        await queryRunner.query(`CREATE TYPE "public"."origem_agendamento" AS ENUM('RECEPCAO', 'APP', 'REMARCACAO', 'ADIANTAMENTO')`);
        await queryRunner.query(`CREATE TYPE "public"."tipo_autor" AS ENUM('PACIENTE', 'CONTATO', 'EQUIPE', 'SISTEMA')`);
        await queryRunner.query(`CREATE TABLE "agendamento" ("id" SERIAL NOT NULL, "pacienteId" integer NOT NULL, "slotId" integer NOT NULL, "status" "public"."status_agendamento" NOT NULL, "origem" "public"."origem_agendamento" NOT NULL, "remarcadoDeId" integer, "criadoPorTipo" "public"."tipo_autor" NOT NULL, "criadoPorId" integer, "confirmadoEm" TIMESTAMP WITH TIME ZONE, "canceladoEm" TIMESTAMP WITH TIME ZONE, "canceladoPorTipo" "public"."tipo_autor", "presencaRegistradaEm" TIMESTAMP WITH TIME ZONE, "criadoEm" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a102b15cfec9ce6d8ac6193345f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "agendamento_paciente_status_idx" ON "agendamento"  ("pacienteId", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "agendamento_slot_ativo_uq" ON "agendamento"  ("slotId") WHERE "status" IN ('PENDENTE', 'CONFIRMADO')`);
        await queryRunner.query(`CREATE TYPE "public"."status_alerta" AS ENUM('ABERTO', 'EM_CONTATO', 'RESOLVIDO')`);
        await queryRunner.query(`CREATE TABLE "alerta_equipe" ("id" SERIAL NOT NULL, "ubsId" integer NOT NULL, "pacienteId" integer NOT NULL, "agendamentoId" integer NOT NULL, "motivo" character varying NOT NULL, "status" "public"."status_alerta" NOT NULL DEFAULT 'ABERTO', "responsavelId" integer, "observacao" text, "criadoEm" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resolvidoEm" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_dc0ff08352882da482725a5a77e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "configuracao" ("id" SERIAL NOT NULL, "chave" character varying NOT NULL, "valor" text NOT NULL, "ubsId" integer, CONSTRAINT "PK_c336b3db951417e6fc27464d052" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "configuracao_ubs_uq" ON "configuracao"  ("chave", "ubsId") WHERE "ubsId" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "configuracao_global_uq" ON "configuracao"  ("chave") WHERE "ubsId" IS NULL`);
        await queryRunner.query(`CREATE TABLE "contato_vinculado" ("id" SERIAL NOT NULL, "pacienteId" integer NOT NULL, "nome" character varying NOT NULL, "relacao" character varying NOT NULL, "telefone" character varying, "email" character varying, "contaPacienteId" integer, "recebeNotificacoes" boolean NOT NULL DEFAULT false, "consentimentoEm" TIMESTAMP WITH TIME ZONE NOT NULL, "consentimentoForma" character varying NOT NULL, "ativo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_46cfe9f6ce0868a703c80512e9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "evento_pontuacao" ("id" SERIAL NOT NULL, "pacienteId" integer NOT NULL, "agendamentoId" integer, "delta" integer NOT NULL, "motivo" character varying NOT NULL, "saldoApos" integer NOT NULL, "criadoEm" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_545ae80c439f9f821c33f9ec82f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "suplente" ("id" SERIAL NOT NULL, "pacienteId" integer NOT NULL, "tipoAtendimentoId" integer NOT NULL, "entrouEm" TIMESTAMP WITH TIME ZONE NOT NULL, "ativo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_f0ff98be42ccf1fc7d9eb3227d0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."status_oferta" AS ENUM('PENDENTE', 'ACEITA', 'RECUSADA', 'EXPIRADA', 'CANCELADA')`);
        await queryRunner.query(`CREATE TABLE "oferta_adiantamento" ("id" SERIAL NOT NULL, "slotId" integer NOT NULL, "agendamentoCandidatoId" integer, "suplenteId" integer, "ordem" integer NOT NULL, "simultanea" boolean NOT NULL DEFAULT false, "status" "public"."status_oferta" NOT NULL DEFAULT 'PENDENTE', "enviadaEm" TIMESTAMP WITH TIME ZONE NOT NULL, "expiraEm" TIMESTAMP WITH TIME ZONE NOT NULL, "respondidaEm" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_03d9b8fdca499457014a958559b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "link_token" ("id" SERIAL NOT NULL, "tokenHash" character varying(64) NOT NULL, "agendamentoId" integer, "ofertaId" integer, "destinatarioTipo" "public"."tipo_autor" NOT NULL, "destinatarioId" integer NOT NULL, "expiraEm" TIMESTAMP WITH TIME ZONE NOT NULL, "usadoEm" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_e16ec0a47418da9f34dc45e496e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8bb835fb04da4709dd01788703" ON "link_token"  ("tokenHash") `);
        await queryRunner.query(`CREATE TYPE "public"."canal" AS ENUM('PUSH', 'WHATSAPP', 'SMS', 'EMAIL')`);
        await queryRunner.query(`CREATE TABLE "log_acao" ("id" SERIAL NOT NULL, "agendamentoId" integer NOT NULL, "acao" character varying NOT NULL, "autorTipo" "public"."tipo_autor" NOT NULL, "autorId" integer, "canal" "public"."canal", "detalhes" jsonb NOT NULL DEFAULT '{}', "criadoEm" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_f8ee2892f0aeeab2ae4de8dbccf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "log_acao_agendamento_idx" ON "log_acao"  ("agendamentoId") `);
        await queryRunner.query(`CREATE TYPE "public"."etapa_notificacao" AS ENUM('D14', 'D7', 'D3', 'D0', 'PRE_AVISO', 'OFERTA', 'CONFIRMACAO_AGENDAMENTO')`);
        await queryRunner.query(`CREATE TYPE "public"."status_notificacao" AS ENUM('AGENDADA', 'ENVIADA', 'ENTREGUE', 'FALHOU', 'RESPONDIDA', 'CANCELADA')`);
        await queryRunner.query(`CREATE TABLE "notificacao" ("id" SERIAL NOT NULL, "agendamentoId" integer, "ofertaId" integer, "destinatarioTipo" "public"."tipo_autor" NOT NULL, "destinatarioId" integer NOT NULL, "etapa" "public"."etapa_notificacao" NOT NULL, "canal" "public"."canal" NOT NULL, "status" "public"."status_notificacao" NOT NULL DEFAULT 'AGENDADA', "agendadaPara" TIMESTAMP WITH TIME ZONE NOT NULL, "enviadaEm" TIMESTAMP WITH TIME ZONE, "respondidaEm" TIMESTAMP WITH TIME ZONE, "tentativa" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_d00eecdb1cf82cafac9e637dbe4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "notificacao_status_agendada_idx" ON "notificacao"  ("status", "agendadaPara") `);
        await queryRunner.query(`ALTER TABLE "usuario_equipe" ADD CONSTRAINT "FK_25a0585e3c2f2e26f4d9856f0d0" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "paciente" ADD CONSTRAINT "FK_f2fb31ab71891300c388d3cf39f" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "paciente" ADD CONSTRAINT "FK_12837ebadea52af42beb22bad2e" FOREIGN KEY ("vulneravelAtribuidoPor") REFERENCES "usuario_equipe"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "profissional" ADD CONSTRAINT "FK_2a4116a5a4cbad2415827597557" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tipo_atendimento" ADD CONSTRAINT "FK_fa68bd06479b34af91585fd95c7" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slot" ADD CONSTRAINT "FK_5b67153bd46d33350dea501872b" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slot" ADD CONSTRAINT "FK_c4c30cfc03318ce261b304d259f" FOREIGN KEY ("tipoAtendimentoId") REFERENCES "tipo_atendimento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agendamento" ADD CONSTRAINT "FK_bdc31f2d4faf6a677a9870dad8e" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agendamento" ADD CONSTRAINT "FK_c3a6677fe634b340d51ed3a88ea" FOREIGN KEY ("slotId") REFERENCES "slot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agendamento" ADD CONSTRAINT "FK_838e29048ae4dbd8190efa317e8" FOREIGN KEY ("remarcadoDeId") REFERENCES "agendamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" ADD CONSTRAINT "FK_1d8e4092f91d37f73e19a4003fc" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" ADD CONSTRAINT "FK_911921a5ebd4774381ed9be1ab4" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" ADD CONSTRAINT "FK_8219b3c1c781cd69bd3f810d2c0" FOREIGN KEY ("agendamentoId") REFERENCES "agendamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" ADD CONSTRAINT "FK_3d6e23fc4f4c410f11cc8f973b6" FOREIGN KEY ("responsavelId") REFERENCES "usuario_equipe"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "configuracao" ADD CONSTRAINT "FK_9a8d7252609b04473d302b15c3a" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contato_vinculado" ADD CONSTRAINT "FK_5a0560b17e146d64120460b2ec8" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contato_vinculado" ADD CONSTRAINT "FK_3610f330dc9552dac5b074e0b77" FOREIGN KEY ("contaPacienteId") REFERENCES "paciente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evento_pontuacao" ADD CONSTRAINT "FK_d8b0e279f019d0bcb5242e58e98" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evento_pontuacao" ADD CONSTRAINT "FK_bc912e639bd85e16bc0a2ca1b35" FOREIGN KEY ("agendamentoId") REFERENCES "agendamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "suplente" ADD CONSTRAINT "FK_8c3e02f165743fc3e79c9144808" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "suplente" ADD CONSTRAINT "FK_96cd921fe853f4f1af84d0bd70b" FOREIGN KEY ("tipoAtendimentoId") REFERENCES "tipo_atendimento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "oferta_adiantamento" ADD CONSTRAINT "FK_3593a6cab93ec063b514a6e52a3" FOREIGN KEY ("slotId") REFERENCES "slot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "oferta_adiantamento" ADD CONSTRAINT "FK_182b4da348ac703ffe16002da70" FOREIGN KEY ("agendamentoCandidatoId") REFERENCES "agendamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "oferta_adiantamento" ADD CONSTRAINT "FK_62adacefcaf34f89da1fbfff1de" FOREIGN KEY ("suplenteId") REFERENCES "suplente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "link_token" ADD CONSTRAINT "FK_537f7bcde2e5fe3e756290786b5" FOREIGN KEY ("agendamentoId") REFERENCES "agendamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "link_token" ADD CONSTRAINT "FK_efa5239104308cb23300f012266" FOREIGN KEY ("ofertaId") REFERENCES "oferta_adiantamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "log_acao" ADD CONSTRAINT "FK_370d0553005973de43e23303184" FOREIGN KEY ("agendamentoId") REFERENCES "agendamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notificacao" ADD CONSTRAINT "FK_c6cc6412df5bbc1b0999d235e0d" FOREIGN KEY ("agendamentoId") REFERENCES "agendamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notificacao" ADD CONSTRAINT "FK_66b36013138e13eebdf68e256ba" FOREIGN KEY ("ofertaId") REFERENCES "oferta_adiantamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notificacao" DROP CONSTRAINT "FK_66b36013138e13eebdf68e256ba"`);
        await queryRunner.query(`ALTER TABLE "notificacao" DROP CONSTRAINT "FK_c6cc6412df5bbc1b0999d235e0d"`);
        await queryRunner.query(`ALTER TABLE "log_acao" DROP CONSTRAINT "FK_370d0553005973de43e23303184"`);
        await queryRunner.query(`ALTER TABLE "link_token" DROP CONSTRAINT "FK_efa5239104308cb23300f012266"`);
        await queryRunner.query(`ALTER TABLE "link_token" DROP CONSTRAINT "FK_537f7bcde2e5fe3e756290786b5"`);
        await queryRunner.query(`ALTER TABLE "oferta_adiantamento" DROP CONSTRAINT "FK_62adacefcaf34f89da1fbfff1de"`);
        await queryRunner.query(`ALTER TABLE "oferta_adiantamento" DROP CONSTRAINT "FK_182b4da348ac703ffe16002da70"`);
        await queryRunner.query(`ALTER TABLE "oferta_adiantamento" DROP CONSTRAINT "FK_3593a6cab93ec063b514a6e52a3"`);
        await queryRunner.query(`ALTER TABLE "suplente" DROP CONSTRAINT "FK_96cd921fe853f4f1af84d0bd70b"`);
        await queryRunner.query(`ALTER TABLE "suplente" DROP CONSTRAINT "FK_8c3e02f165743fc3e79c9144808"`);
        await queryRunner.query(`ALTER TABLE "evento_pontuacao" DROP CONSTRAINT "FK_bc912e639bd85e16bc0a2ca1b35"`);
        await queryRunner.query(`ALTER TABLE "evento_pontuacao" DROP CONSTRAINT "FK_d8b0e279f019d0bcb5242e58e98"`);
        await queryRunner.query(`ALTER TABLE "contato_vinculado" DROP CONSTRAINT "FK_3610f330dc9552dac5b074e0b77"`);
        await queryRunner.query(`ALTER TABLE "contato_vinculado" DROP CONSTRAINT "FK_5a0560b17e146d64120460b2ec8"`);
        await queryRunner.query(`ALTER TABLE "configuracao" DROP CONSTRAINT "FK_9a8d7252609b04473d302b15c3a"`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" DROP CONSTRAINT "FK_3d6e23fc4f4c410f11cc8f973b6"`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" DROP CONSTRAINT "FK_8219b3c1c781cd69bd3f810d2c0"`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" DROP CONSTRAINT "FK_911921a5ebd4774381ed9be1ab4"`);
        await queryRunner.query(`ALTER TABLE "alerta_equipe" DROP CONSTRAINT "FK_1d8e4092f91d37f73e19a4003fc"`);
        await queryRunner.query(`ALTER TABLE "agendamento" DROP CONSTRAINT "FK_838e29048ae4dbd8190efa317e8"`);
        await queryRunner.query(`ALTER TABLE "agendamento" DROP CONSTRAINT "FK_c3a6677fe634b340d51ed3a88ea"`);
        await queryRunner.query(`ALTER TABLE "agendamento" DROP CONSTRAINT "FK_bdc31f2d4faf6a677a9870dad8e"`);
        await queryRunner.query(`ALTER TABLE "slot" DROP CONSTRAINT "FK_c4c30cfc03318ce261b304d259f"`);
        await queryRunner.query(`ALTER TABLE "slot" DROP CONSTRAINT "FK_5b67153bd46d33350dea501872b"`);
        await queryRunner.query(`ALTER TABLE "tipo_atendimento" DROP CONSTRAINT "FK_fa68bd06479b34af91585fd95c7"`);
        await queryRunner.query(`ALTER TABLE "profissional" DROP CONSTRAINT "FK_2a4116a5a4cbad2415827597557"`);
        await queryRunner.query(`ALTER TABLE "paciente" DROP CONSTRAINT "FK_12837ebadea52af42beb22bad2e"`);
        await queryRunner.query(`ALTER TABLE "paciente" DROP CONSTRAINT "FK_f2fb31ab71891300c388d3cf39f"`);
        await queryRunner.query(`ALTER TABLE "usuario_equipe" DROP CONSTRAINT "FK_25a0585e3c2f2e26f4d9856f0d0"`);
        await queryRunner.query(`DROP INDEX "public"."notificacao_status_agendada_idx"`);
        await queryRunner.query(`DROP TABLE "notificacao"`);
        await queryRunner.query(`DROP TYPE "public"."status_notificacao"`);
        await queryRunner.query(`DROP TYPE "public"."etapa_notificacao"`);
        await queryRunner.query(`DROP INDEX "public"."log_acao_agendamento_idx"`);
        await queryRunner.query(`DROP TABLE "log_acao"`);
        await queryRunner.query(`DROP TYPE "public"."canal"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8bb835fb04da4709dd01788703"`);
        await queryRunner.query(`DROP TABLE "link_token"`);
        await queryRunner.query(`DROP TABLE "oferta_adiantamento"`);
        await queryRunner.query(`DROP TYPE "public"."status_oferta"`);
        await queryRunner.query(`DROP TABLE "suplente"`);
        await queryRunner.query(`DROP TABLE "evento_pontuacao"`);
        await queryRunner.query(`DROP TABLE "contato_vinculado"`);
        await queryRunner.query(`DROP INDEX "public"."configuracao_global_uq"`);
        await queryRunner.query(`DROP INDEX "public"."configuracao_ubs_uq"`);
        await queryRunner.query(`DROP TABLE "configuracao"`);
        await queryRunner.query(`DROP TABLE "alerta_equipe"`);
        await queryRunner.query(`DROP TYPE "public"."status_alerta"`);
        await queryRunner.query(`DROP INDEX "public"."agendamento_slot_ativo_uq"`);
        await queryRunner.query(`DROP INDEX "public"."agendamento_paciente_status_idx"`);
        await queryRunner.query(`DROP TABLE "agendamento"`);
        await queryRunner.query(`DROP TYPE "public"."tipo_autor"`);
        await queryRunner.query(`DROP TYPE "public"."origem_agendamento"`);
        await queryRunner.query(`DROP TYPE "public"."status_agendamento"`);
        await queryRunner.query(`DROP INDEX "public"."slot_profissional_inicio_uq"`);
        await queryRunner.query(`DROP INDEX "public"."slot_tipo_status_inicio_idx"`);
        await queryRunner.query(`DROP TABLE "slot"`);
        await queryRunner.query(`DROP TYPE "public"."status_slot"`);
        await queryRunner.query(`DROP TYPE "public"."origem_slot"`);
        await queryRunner.query(`DROP TABLE "tipo_atendimento"`);
        await queryRunner.query(`DROP TYPE "public"."categoria_atendimento"`);
        await queryRunner.query(`DROP TABLE "profissional"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8eb9dba1cf8f89575da9a5cb6d"`);
        await queryRunner.query(`DROP TABLE "paciente"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc0db4ded5059d50ab6b10b407"`);
        await queryRunner.query(`DROP TABLE "usuario_equipe"`);
        await queryRunner.query(`DROP TYPE "public"."perfil_equipe"`);
        await queryRunner.query(`DROP TABLE "ubs"`);
    }

}
