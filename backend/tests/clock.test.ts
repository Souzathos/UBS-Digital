import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { AdjustableClock } from "../src/clock/AdjustableClock";
import { relogioAjustavel } from "../src/clock";
import { JobRunner } from "../src/jobs/runner";
import { avancarRelogioRodandoJobs } from "../src/jobs/relogioDev";
import { api } from "./helpers";

const HORA = 60 * 60 * 1000

function arquivosTs(pasta: string): string[] {
    let saida: string[] = []
    let itens: string[] = []
    try { itens = readdirSync(pasta) } catch { return [] }
    for(const item of itens) {
        const caminho = path.join(pasta, item)
        if(statSync(caminho).isDirectory()) saida = saida.concat(arquivosTs(caminho))
        else if(caminho.endsWith('.ts')) saida.push(caminho)
    }
    return saida
}

describe('relógio injetável (RN-90)', () => {
    afterEach(() => relogioAjustavel!.zerar())

    it('RN-90: AdjustableClock congelado avança e define', () => {
        const relogio = new AdjustableClock()
        relogio.congelar(new Date('2026-11-16T10:00:00'))
        assert.equal(relogio.now().toISOString(), new Date('2026-11-16T10:00:00').toISOString())

        relogio.avancar(2 * HORA)
        assert.equal(relogio.now().getHours(), 12)

        relogio.definir(new Date('2026-12-01T07:00:00'))
        assert.equal(relogio.now().getDate(), 1)
        assert.throws(() => relogio.avancar(-1))
    })

    it('RN-90: AdjustableClock fluindo soma o deslocamento ao relógio real', () => {
        const relogio = new AdjustableClock()
        relogio.avancar(14 * 24 * HORA)
        const diferenca = relogio.now().getTime() - new Date().getTime()
        assert.ok(Math.abs(diferenca - 14 * 24 * HORA) < 1000)

        relogio.zerar()
        assert.ok(Math.abs(relogio.now().getTime() - new Date().getTime()) < 1000)
    })

    it('RN-90: nenhum arquivo em services, jobs, notifications e web lê o relógio do sistema', () => {
        const pastas = ['services', 'jobs', 'notifications', 'web'].map(p => path.join(__dirname, '..', 'src', p))
        const infratores: string[] = []

        for(const arquivo of pastas.flatMap(arquivosTs)) {
            const codigo = readFileSync(arquivo, 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
            if(/Date\.now\(|new Date\(\s*\)/.test(codigo)) infratores.push(path.relative(process.cwd(), arquivo))
        }

        assert.deepEqual(infratores, [], 'use o Clock injetável em vez de Date.now() / new Date()')
    })

    it('RN-90: avançar o relógio roda os jobs a cada passo de 1h, na ordem do tempo', async () => {
        const relogio = new AdjustableClock()
        relogio.congelar(new Date('2026-11-16T00:00:00'))
        const runner = new JobRunner(relogio)
        const vistos: number[] = []
        runner.registrar({ nome: 'espiao', executar: async agora => { vistos.push(agora.getTime()); return { rodadas: 1 } } })

        const resultado = await avancarRelogioRodandoJobs(relogio, runner, 3 * 24 * HORA + 30 * 60 * 1000)

        assert.equal(resultado.passos, 73)
        assert.equal(resultado.jobs.espiao.rodadas, 73)
        assert.deepEqual(vistos, [...vistos].sort((a, b) => a - b))
        assert.equal(relogio.now().toISOString(), new Date('2026-11-19T00:30:00').toISOString())
    })

    it('RN-90: endpoints /dev avançam, definem e zeram o relógio', async () => {
        const definir = await api().post('/dev/relogio/definir').send({ para: '2030-01-01T07:00:00-03:00' })
        assert.equal(definir.status, 200)
        assert.equal(new Date(definir.body.agora).getFullYear(), 2030)

        const avancar = await api().post('/dev/relogio/avancar').send({ horas: 5 })
        assert.equal(avancar.status, 200)
        assert.equal(avancar.body.passos, 5)
        assert.ok(new Date(avancar.body.agora).getTime() - new Date(definir.body.agora).getTime() >= 5 * HORA)

        const invalido = await api().post('/dev/relogio/avancar').send({})
        assert.equal(invalido.status, 400)

        const zerar = await api().post('/dev/relogio/zerar')
        assert.ok(Math.abs(new Date(zerar.body.agora).getTime() - new Date().getTime()) < 5000)
    })
})
