import { MigrationInterface, QueryRunner } from "typeorm";

// 14/11: categoria CONSULTA (médico) / PROCEDIMENTO (enfermagem), ruas com médico de referência,
// rua e número no paciente, categoria no profissional.
// Gerada por "migration:generate" e reescrita à mão: o TypeORM recriava o enum convertendo por texto
// (falha com valores EXAME já gravados) e adicionava a coluna do profissional com o tipo antigo.
// Aqui o EXAME só muda de nome (RENAME VALUE) e os profissionais existentes recebem a categoria pela função.
export class CategoriaRuas1794628292790 implements MigrationInterface {
    name = 'CategoriaRuas1794628292790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."categoria_atendimento" RENAME VALUE 'EXAME' TO 'PROCEDIMENTO'`);

        await queryRunner.query(`CREATE TABLE "rua" ("id" SERIAL NOT NULL, "ubsId" integer NOT NULL, "nome" character varying NOT NULL, "medicoReferenciaId" integer NOT NULL, CONSTRAINT "PK_abb2b96b22ebb53ba612f5c7456" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "rua_ubs_nome_uq" ON "rua"  ("ubsId", "nome") `);

        await queryRunner.query(`ALTER TABLE "profissional" ADD "categoria" "public"."categoria_atendimento" NOT NULL DEFAULT 'CONSULTA'`);
        await queryRunner.query(`UPDATE "profissional" SET "categoria" = 'PROCEDIMENTO' WHERE "funcao" ILIKE 'enferm%' OR "funcao" ILIKE 't_cnic%'`);
        await queryRunner.query(`ALTER TABLE "profissional" ALTER COLUMN "categoria" DROP DEFAULT`);

        await queryRunner.query(`ALTER TABLE "paciente" ADD "ruaId" integer`);
        await queryRunner.query(`ALTER TABLE "paciente" ADD "numero" character varying(10)`);

        await queryRunner.query(`ALTER TABLE "rua" ADD CONSTRAINT "FK_9ed2dc30acb43a8fda6f296d62c" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rua" ADD CONSTRAINT "FK_920fe8468576d14c6bd12e59b79" FOREIGN KEY ("medicoReferenciaId") REFERENCES "profissional"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "paciente" ADD CONSTRAINT "FK_8fb43e9e992ba6b365da20e4b36" FOREIGN KEY ("ruaId") REFERENCES "rua"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "paciente" DROP CONSTRAINT "FK_8fb43e9e992ba6b365da20e4b36"`);
        await queryRunner.query(`ALTER TABLE "rua" DROP CONSTRAINT "FK_920fe8468576d14c6bd12e59b79"`);
        await queryRunner.query(`ALTER TABLE "rua" DROP CONSTRAINT "FK_9ed2dc30acb43a8fda6f296d62c"`);
        await queryRunner.query(`ALTER TABLE "paciente" DROP COLUMN "numero"`);
        await queryRunner.query(`ALTER TABLE "paciente" DROP COLUMN "ruaId"`);
        await queryRunner.query(`ALTER TABLE "profissional" DROP COLUMN "categoria"`);
        await queryRunner.query(`DROP INDEX "public"."rua_ubs_nome_uq"`);
        await queryRunner.query(`DROP TABLE "rua"`);
        await queryRunner.query(`ALTER TYPE "public"."categoria_atendimento" RENAME VALUE 'PROCEDIMENTO' TO 'EXAME'`);
    }
}
