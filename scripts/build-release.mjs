import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { open } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const extRoot = resolve(here, '..')
const workspace = resolve(extRoot, '..')
const hostRoot = join(workspace, 'host-frontend')
const pluginsRoot = join(workspace, 'plugins')
const customSuitesRoot = join(workspace, 'custom-suites')
const themesRoot = join(workspace, 'themes')

const releaseDir = join(extRoot, 'release')
const suitesOutDir = join(releaseDir, 'suites')
const pluginsOutDir = join(releaseDir, 'plugins')
const runtimesOutDir = join(releaseDir, 'runtimes')
const themesOutDir = join(releaseDir, 'themes')
const suiteSpecsDir = join(extRoot, 'suites')

const spec = JSON.parse(readFileSync(join(extRoot, 'catalog-spec.json'), 'utf8'))
const VERSION = spec.releaseVersion

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function resetDir(dir) {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}

function copyPluginSource(srcDir, dstDir) {
  cpSync(srcDir, dstDir, {
    recursive: true,
    filter: (src) => {
      const name = basename(src)
      return name !== '.git' && name !== 'artifacts' && name !== 'node_modules' && name !== '.DS_Store'
    }
  })
  const nm = join(srcDir, 'node_modules')
  if (existsSync(nm)) {
    symlinkSync(nm, join(dstDir, 'node_modules'), 'dir')
  }
}

function packPluginFromDir(pluginDir, outFile, overrides = null) {
  if (!overrides) {
    execFileSync(process.execPath, [join(hostRoot, 'scripts/plugins/pack.ts'), pluginDir, outFile], {
      cwd: hostRoot,
      stdio: 'pipe'
    })
    return JSON.parse(readFileSync(join(pluginDir, 'plugin.json'), 'utf8'))
  }
  const stage = mkdtempSync(join(tmpdir(), `huoye-ext-plugin-${basename(pluginDir)}-`))
  try {
    const stagedDir = join(stage, basename(pluginDir))
    copyPluginSource(pluginDir, stagedDir)
    const manifestPath = join(stagedDir, 'plugin.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const oldTitle = manifest.title
    const oldDesc = manifest.description
    manifest.version = VERSION
    if (overrides.titleZh) manifest.title = overrides.titleZh
    if (overrides.descZh) manifest.description = overrides.descZh
    if (manifest.locales?.en) {
      if (overrides.titleEn) {
        if (oldTitle && oldTitle !== manifest.title) delete manifest.locales.en[oldTitle]
        manifest.locales.en[manifest.title] = overrides.titleEn
      }
      if (overrides.descEn) {
        if (oldDesc && oldDesc !== manifest.description) delete manifest.locales.en[oldDesc]
        manifest.locales.en[manifest.description] = overrides.descEn
      }
    } else if (overrides.titleEn || overrides.descEn) {
      manifest.locales = {
        en: {
          ...(overrides.titleEn ? { [manifest.title]: overrides.titleEn } : {}),
          ...(overrides.descEn ? { [manifest.description]: overrides.descEn } : {})
        }
      }
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    execFileSync(process.execPath, [join(hostRoot, 'scripts/plugins/pack.ts'), stagedDir, outFile], {
      cwd: hostRoot,
      stdio: 'pipe'
    })
    return manifest
  } finally {
    rmSync(stage, { recursive: true, force: true })
  }
}

async function restampRuntime(srcFile, dstFile, newVersion) {
  const magic = Buffer.from('HUOYE-RUNTIME/1\n')
  const headerPrefixLen = magic.length + 4
  const fh = await open(srcFile, 'r')
  try {
    const prefix = Buffer.alloc(headerPrefixLen)
    await fh.read(prefix, 0, headerPrefixLen, 0)
    if (!prefix.subarray(0, magic.length).equals(magic)) {
      throw new Error(`Invalid runtime magic in ${srcFile}`)
    }
    const metaLen = prefix.readUInt32BE(magic.length)
    const metaBuf = Buffer.alloc(metaLen)
    await fh.read(metaBuf, 0, metaLen, headerPrefixLen)
    const manifest = JSON.parse(metaBuf.toString('utf8'))
    manifest.version = newVersion
    const nextMeta = Buffer.from(JSON.stringify(manifest))
    const nextPrefix = Buffer.alloc(headerPrefixLen)
    magic.copy(nextPrefix)
    nextPrefix.writeUInt32BE(nextMeta.length, magic.length)

    const out = createWriteStream(dstFile)
    out.write(nextPrefix)
    out.write(nextMeta)
    const payloadStart = headerPrefixLen + metaLen
    await pipeline(createReadStream(srcFile, { start: payloadStart }), out)
    return manifest
  } finally {
    await fh.close()
  }
}

async function main() {
  resetDir(releaseDir)
  mkdirSync(suitesOutDir, { recursive: true })
  mkdirSync(pluginsOutDir, { recursive: true })
  mkdirSync(runtimesOutDir, { recursive: true })
  mkdirSync(themesOutDir, { recursive: true })
  resetDir(suiteSpecsDir)

  // 1. Pack 38 curated standalone plugins at v0.1.0 with refined ZH/EN descriptions
  console.log(`\n[1/4] Packing ${spec.plugins.length} standalone plugins (v${VERSION})...`)
  const standaloneMap = new Map()
  const pluginsOut = []
  for (const item of spec.plugins) {
    const srcDir = join(pluginsRoot, item.id)
    if (!existsSync(join(srcDir, 'plugin.json'))) {
      throw new Error(`Missing plugin source: ${srcDir}`)
    }
    const fileName = `${item.id}-${VERSION}.hyplugin`
    const outFile = join(pluginsOutDir, fileName)
    const manifest = packPluginFromDir(srcDir, outFile, item)
    standaloneMap.set(item.id, { file: outFile, manifest, spec: item })
    const provides = manifest.capabilities?.provides?.map((c) => (typeof c === 'string' ? c : c.id)) || []
    const consumes = manifest.capabilities?.consumes?.map((c) => (typeof c === 'string' ? c : c.id)) || []
    pluginsOut.push({
      id: item.id,
      titleZh: item.titleZh,
      titleEn: item.titleEn,
      version: VERSION,
      category: item.category,
      platform: item.platform,
      descZh: item.descZh,
      descEn: item.descEn,
      provides,
      consumes,
      file: `plugins/${fileName}`,
      assetName: fileName,
      downloadUrl: `${spec.releaseBaseUrl}/huoye-extensions-plugins-${VERSION}.zip`,
      bytes: statSync(outFile).size,
      sha256: sha256File(outFile)
    })
    process.stdout.write(`  ✓ ${item.id} (${(statSync(outFile).size / 1024).toFixed(1)} KB)\n`)
  }

  // Helper cache for host companion plugins bundled inside suites (e.g., collection, tags, rating, note, table, annotate...)
  const companionCacheDir = mkdtempSync(join(tmpdir(), 'huoye-ext-companions-'))
  const companionCache = new Map()
  function ensurePackageFile(pkgId) {
    if (standaloneMap.has(pkgId)) return standaloneMap.get(pkgId).file
    if (companionCache.has(pkgId)) return companionCache.get(pkgId)
    const srcDir = join(pluginsRoot, pkgId)
    if (!existsSync(join(srcDir, 'plugin.json'))) {
      throw new Error(`Missing companion plugin source: ${srcDir}`)
    }
    const outFile = join(companionCacheDir, `${pkgId}.hyplugin`)
    packPluginFromDir(srcDir, outFile)
    companionCache.set(pkgId, outFile)
    return outFile
  }

  // 2. Build 8 consolidated suites at v0.1.0
  console.log(`\n[2/4] Building ${spec.suites.length} consolidated suites (v${VERSION})...`)
  const suitesOut = []
  try {
    for (const s of spec.suites) {
      const sourceJsons = new Map()
      for (const srcId of s.sources) {
        sourceJsons.set(srcId, JSON.parse(readFileSync(join(customSuitesRoot, srcId, 'suite.json'), 'utf8')))
      }
      const pkgSet = new Set()
      for (const srcJson of sourceJsons.values()) {
        for (const rel of srcJson.packages || []) {
          pkgSet.add(rel.replace(/^packages\//, '').replace(/\.(hyplugin|rmplugin)$/, ''))
        }
      }
      for (const extra of s.extraPackages || []) pkgSet.add(extra)

      const mergedEnLocales = {}
      for (const srcJson of sourceJsons.values()) {
        Object.assign(mergedEnLocales, srcJson.locales?.en || {})
      }
      mergedEnLocales[s.titleZh] = s.titleEn
      mergedEnLocales[s.descZh] = s.descEn

      const presets = []
      for (const pSpec of s.presets) {
        const srcJson = sourceJsons.get(pSpec.source)
        const basePreset = (srcJson?.presets || []).find((p) => p.id === pSpec.id)
        if (!basePreset) {
          throw new Error(`Preset ${pSpec.id} not found in source suite ${pSpec.source}`)
        }
        presets.push({
          ...basePreset,
          title: pSpec.titleZh,
          description: pSpec.descZh
        })
        mergedEnLocales[pSpec.titleZh] = pSpec.titleEn
        mergedEnLocales[pSpec.descZh] = pSpec.descEn
      }

      // Ensure updated standalone plugin titles have matching EN locales in suite
      for (const pkgId of pkgSet) {
        const entry = standaloneMap.get(pkgId)
        if (entry) {
          mergedEnLocales[entry.spec.titleZh] = entry.spec.titleEn
        }
      }

      const stageDir = join(suiteSpecsDir, s.id)
      const stagePkgDir = join(stageDir, 'packages')
      mkdirSync(stagePkgDir, { recursive: true })
      const packagePaths = []
      for (const pkgId of pkgSet) {
        const srcPkg = ensurePackageFile(pkgId)
        copyFileSync(srcPkg, join(stagePkgDir, `${pkgId}.hyplugin`))
        packagePaths.push(`packages/${pkgId}.hyplugin`)
      }

      const suiteManifest = {
        formatVersion: 1,
        id: s.id,
        title: s.titleZh,
        version: VERSION,
        description: s.descZh,
        packages: packagePaths,
        presets,
        locales: { en: mergedEnLocales }
      }
      const suiteJsonPath = join(stageDir, 'suite.json')
      writeFileSync(suiteJsonPath, JSON.stringify(suiteManifest, null, 2) + '\n')

      const fileName = `${s.id}-${VERSION}.hysuite`
      const outSuite = join(suitesOutDir, fileName)
      execFileSync(process.execPath, [join(hostRoot, 'scripts/plugins/suite.mjs'), suiteJsonPath, outSuite], {
        cwd: hostRoot,
        stdio: 'pipe'
      })
      // Clean temporary packages copy from suites/<id>/ so repo stays light (keep suite.json cleanly in git)
      rmSync(stagePkgDir, { recursive: true, force: true })

      suitesOut.push({
        id: s.id,
        titleZh: s.titleZh,
        titleEn: s.titleEn,
        tagZh: s.tagZh,
        tagEn: s.tagEn,
        version: VERSION,
        platform: s.platform,
        platformNoteZh: s.platformNoteZh,
        platformNoteEn: s.platformNoteEn,
        descZh: s.descZh,
        descEn: s.descEn,
        packageCount: packagePaths.length,
        featuredPlugins: [...pkgSet].filter((id) => standaloneMap.has(id)),
        presets: s.presets.map((p) => {
          const matched = presets.find((x) => x.id === p.id)
          return {
            id: p.id,
            titleZh: p.titleZh,
            titleEn: p.titleEn,
            descZh: p.descZh,
            descEn: p.descEn,
            recommendedTheme: matched?.recommendedTheme || null
          }
        }),
        file: `suites/${fileName}`,
        assetName: fileName,
        downloadUrl: `${spec.releaseBaseUrl}/${fileName}`,
        bytes: statSync(outSuite).size,
        sha256: sha256File(outSuite)
      })
      process.stdout.write(`  ✓ ${fileName} (${packagePaths.length} pkgs, ${presets.length} presets, ${(statSync(outSuite).size / 1024 / 1024).toFixed(2)} MB)\n`)
    }
  } finally {
    rmSync(companionCacheDir, { recursive: true, force: true })
  }

  // 3. Restamp 2 runtimes to v0.1.0 and verify via host runtime-package
  console.log(`\n[3/4] Packaging ${spec.runtimes.length} shared runtimes (v${VERSION})...`)
  const { inspectRuntime } = await import(join(hostRoot, 'src/platform/runtime-package.ts'))
  const runtimesOut = []
  for (const rt of spec.runtimes) {
    const srcFile = join(workspace, rt.sourceFile)
    if (!existsSync(srcFile)) throw new Error(`Missing runtime source: ${srcFile}`)
    const outFile = join(runtimesOutDir, rt.outputFile)
    await restampRuntime(srcFile, outFile, VERSION)
    const inspected = await inspectRuntime(outFile)
    if (inspected.manifest.version !== VERSION) {
      throw new Error(`Runtime version verification failed for ${rt.id}`)
    }
    runtimesOut.push({
      id: rt.id,
      nameZh: rt.nameZh,
      nameEn: rt.nameEn,
      version: VERSION,
      platform: rt.platform,
      platformLabelZh: rt.platformLabelZh,
      platformLabelEn: rt.platformLabelEn,
      summaryZh: rt.summaryZh,
      summaryEn: rt.summaryEn,
      usedBy: rt.usedBy,
      file: `runtimes/${rt.outputFile}`,
      assetName: rt.outputFile,
      downloadUrl: `${spec.releaseBaseUrl}/${rt.outputFile}`,
      bytes: statSync(outFile).size,
      sha256: sha256File(outFile)
    })
    process.stdout.write(`  ✓ ${rt.outputFile} (${(statSync(outFile).size / 1024 / 1024).toFixed(1)} MB, verified)\n`)
  }

  // 4. Package curated themes (hakurei-shrine)
  console.log(`\n[4/4] Packaging ${spec.themes.length} curated theme(s)...`)
  const themesOut = []
  for (const th of spec.themes) {
    const srcTheme = join(themesRoot, th.id, 'dist', `${th.id}.hytheme`)
    const themeJson = JSON.parse(readFileSync(join(themesRoot, th.id, 'theme', 'theme.json'), 'utf8'))
    if (!existsSync(srcTheme)) throw new Error(`Missing theme artifact: ${srcTheme}`)
    const fileName = `${th.id}-${VERSION}.hytheme`
    const outFile = join(themesOutDir, fileName)
    copyFileSync(srcTheme, outFile)
    const lightVar = themeJson.variants?.light
    const darkVar = themeJson.variants?.dark
    themesOut.push({
      id: th.id,
      nameZh: th.nameZh,
      nameEn: th.nameEn,
      version: VERSION,
      descZh: th.descZh,
      descEn: th.descEn,
      dualMode: Boolean(lightVar && darkVar),
      lightColors: {
        bg: lightVar.colors.bg,
        panel: lightVar.colors.panel,
        accent: lightVar.colors.accent,
        text: lightVar.colors.text
      },
      darkColors: darkVar
        ? {
            bg: darkVar.colors.bg,
            panel: darkVar.colors.panel,
            accent: darkVar.colors.accent,
            text: darkVar.colors.text
          }
        : null,
      file: `themes/${fileName}`,
      assetName: fileName,
      downloadUrl: `${spec.releaseBaseUrl}/${fileName}`,
      bytes: statSync(outFile).size,
      sha256: sha256File(outFile)
    })
    process.stdout.write(`  ✓ ${fileName} (${(statSync(outFile).size / 1024).toFixed(1)} KB)\n`)
  }

  // 5. Bundle 38 standalone plugins into a single clean ZIP archive for GitHub Releases
  const pluginsBundleName = `huoye-extensions-plugins-${VERSION}.zip`
  const pluginsBundlePath = join(releaseDir, pluginsBundleName)
  const bundleStage = mkdtempSync(join(tmpdir(), 'huoye-ext-plugins-zip-'))
  try {
    const folderName = `huoye-extensions-plugins-${VERSION}`
    const folderPath = join(bundleStage, folderName)
    mkdirSync(folderPath, { recursive: true })
    for (const p of pluginsOut) {
      copyFileSync(join(releaseDir, p.file), join(folderPath, p.assetName))
    }
    execFileSync('zip', ['-rq', '-X', pluginsBundlePath, folderName], { cwd: bundleStage, stdio: 'pipe' })
  } finally {
    rmSync(bundleStage, { recursive: true, force: true })
  }
  const pluginsBundle = {
    assetName: pluginsBundleName,
    downloadUrl: `${spec.releaseBaseUrl}/${pluginsBundleName}`,
    count: pluginsOut.length,
    bytes: statSync(pluginsBundlePath).size,
    sha256: sha256File(pluginsBundlePath)
  }

  // 6. Write manifest.json & SHA256SUMS.txt (12 downloadable release assets + SHA256SUMS.txt = 13 files)
  const manifest = {
    generatedAt: new Date().toISOString(),
    releaseVersion: VERSION,
    releaseTag: spec.releaseTag,
    repo: spec.repo,
    repoUrl: spec.repoUrl,
    releaseBaseUrl: spec.releaseBaseUrl,
    counts: {
      suites: suitesOut.length,
      runtimes: runtimesOut.length,
      themes: themesOut.length,
      plugins: pluginsOut.length
    },
    pluginsBundle,
    suites: suitesOut,
    runtimes: runtimesOut,
    themes: themesOut,
    plugins: pluginsOut
  }
  writeFileSync(join(extRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  const releaseAssets = [...suitesOut, ...runtimesOut, ...themesOut, pluginsBundle]
  const shaLines = releaseAssets.map((a) => `${a.sha256}  ${a.assetName}`).join('\n') + '\n'
  writeFileSync(join(releaseDir, 'SHA256SUMS.txt'), shaLines)

  // 6. Render illustrated README.md & README.en.md via render-readme.mjs
  execFileSync(process.execPath, [join(here, 'render-readme.mjs')], { cwd: extRoot, stdio: 'inherit' })

  console.log(
    `\n✅ huoye-extensions v${VERSION} release ready: ${suitesOut.length} suites · ${runtimesOut.length} runtimes · ${themesOut.length} theme · ${pluginsOut.length} plugins`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
