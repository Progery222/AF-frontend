export const SHARED_SCENARIO_SERIAL = '_shared'

/** Подставляет serial телефона в YAML шаблона. */
export function yamlForPhone(templateYaml: string, serial: string): string {
  return templateYaml.replace(/serial:\s*"?[^"\n]*"?/, `serial: "${serial}"`)
}

export async function applySharedScenarioToPhones(
  sharedId: string,
  targetSerials: string[],
  fetchFiles: (id: string) => Promise<{ scenario_yaml: string; variables_yaml: string }>,
  put: (serial: string, id: string, files: { scenario_yaml: string; variables_yaml: string }) => Promise<unknown>,
  setActive: (serial: string, id: string) => Promise<unknown>,
  options?: { activate?: boolean },
): Promise<{ ok: string[]; failed: { serial: string; error: string }[] }> {
  const files = await fetchFiles(sharedId)
  const activate = options?.activate !== false
  const ok: string[] = []
  const failed: { serial: string; error: string }[] = []

  await Promise.all(
    targetSerials.map(async (serial) => {
      try {
        await put(serial, sharedId, {
          scenario_yaml: yamlForPhone(files.scenario_yaml, serial),
          variables_yaml: files.variables_yaml,
        })
        if (activate) {
          await setActive(serial, sharedId)
        }
        ok.push(serial)
      } catch (e) {
        failed.push({ serial, error: e instanceof Error ? e.message : String(e) })
      }
    }),
  )

  return { ok, failed }
}
