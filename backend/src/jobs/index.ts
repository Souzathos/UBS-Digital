import { criarLembretesJob } from "./lembretesJob";
import { jobRunner } from "./runner";

// Os jobs da aplicação são registrados aqui, na ordem em que devem rodar a cada tick.
jobRunner.registrar(criarLembretesJob())

export { jobRunner }
