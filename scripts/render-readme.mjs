import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const extRoot = resolve(here, '..')
const manifest = JSON.parse(readFileSync(join(extRoot, 'manifest.json'), 'utf8'))

const { releaseVersion, releaseTag, repoUrl, pluginsBundle, suites, runtimes, themes, plugins } = manifest

const fmtSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`)
const picture = (base, alt) => `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/${base}-dark.webp" />
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/${base}-light.webp" />
  <img alt="${alt}" src="docs/assets/${base}-light.webp" />
</picture>`

const picLang = (prefix, lang, alt) => `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/${prefix}-dark-${lang}.webp" />
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/${prefix}-light-${lang}.webp" />
  <img alt="${alt}" src="docs/assets/${prefix}-light-${lang}.webp" />
</picture>`

const catZh = {
  visual: '视觉与画室',
  design: '设计资产',
  reading: '阅读与书库',
  media: '影音与听译',
  office: '文档与数据',
  utility: '批处理与治理',
  engine: '算力引擎'
}
const catEn = {
  visual: 'Visual & Studio',
  design: 'Design',
  reading: 'Reading',
  media: 'Media & Speech',
  office: 'Docs & Data',
  utility: 'Batch & Hygiene',
  engine: 'Compute Engines'
}

const readmeZh = `<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/huoye-lockup-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/huoye-lockup-light.svg" />
  <img alt="活页 Huoye 扩展仓库" src="docs/assets/huoye-lockup-light.svg" height="60" />
</picture>

**活页官方扩展仓库 · \`huoye-extensions\`**

简体中文 | [English](README.en.md) · [活页主仓库](https://github.com/XinXingNOVA/huoye) · [官网扩展馆](https://huoye.org/catalog) · [下载 ${releaseTag} 产物](${repoUrl}/releases/tag/${releaseTag})

[![Version](https://img.shields.io/badge/Extensions-${releaseTag}-14B8A6.svg)](${repoUrl}/releases/tag/${releaseTag})
[![Host](https://img.shields.io/badge/Requires-Huoye%20v0.3.0%2B-38BDF8.svg)](https://github.com/XinXingNOVA/huoye/releases)
[![License](https://img.shields.io/badge/License-Apache--2.0-64748B.svg)](https://github.com/XinXingNOVA/huoye/blob/main/LICENSE)

[安装图解](#三分钟学会安装四种内页) · [8 套场景套件](#场景套件8-套) · [离线运行包](#离线共享运行包2-个) · [独立主题](#独立主题1-套) · [38 个单装插件](#单装插件38-个)

</div>

---

${picLang('preview-suites', 'zh', '活页官方扩展可拼装出的四种工作台：文档表格台、视觉参考板、青瓷书房与离线听译')}

本仓库专门集中发布 **活页（Huoye）** 的官方扩展产物，与主程序版本解耦，方便独立迭代与按需下载（当前发布版本 \`${releaseTag}\`）：

- **${suites.length} 套场景套件（\`.hysuite\`）**：按工作现场打包整套插件与分屏预设，**新手推荐直接从套件起步**；
- **${runtimes.length} 个离线共享运行包（\`.hyruntime\`）**：重型本地模型与原生推理程序，导入一次跨仓库共用；
- **${themes.length} 套独立主题（\`.hytheme\`）**：纯声明式外观包（另有 4 套内置主题及主仓 \`host/examples/themes/\` 附带的「银杏·秋光」「蓝晒」2 套示例主题）；
- **${plugins.length} 个单装插件（\`.hyplugin\`）**：进阶用户按需单装或自由拼装。

> 所有文件均可在 [Releases (${releaseTag})](${repoUrl}/releases/tag/${releaseTag}) 直接下载，并附带 [\`SHA256SUMS.txt\`](${repoUrl}/releases/download/${releaseTag}/SHA256SUMS.txt) 供核对校验和。

---

## 三分钟学会安装四种内页

活页采用「**先安装到本机，再按仓库自由启停**」机制：装好的套件、插件和主题不会强行塞满你原有的每一个仓库，停用或卸载插件也不会删掉你的数据。

### 1. 安装场景套件（\`.hysuite\`）与单装插件（\`.hyplugin\`）

1. 在活页打开 **「设置 → 套件与插件包」**（新建仓库时也可在开始页直接导入套件），点击 **「安装套件或插件包…」** 或直接把 \`.hysuite\` / \`.hyplugin\` 文件拖进窗口；
2. 核对预览中的名称、版本与依赖后确认安装；
3. 打开目标仓库，进入 **「设置 → 功能与方案 → 启停功能」**，勾选刚装好的插件（或直接套用套件预设），点 **「应用并重新加载」** 即刻生效。

${picLang('guide-plugins', 'zh', '在活页设置中勾选并应用插件')}

### 2. 导入离线共享运行包（\`.hyruntime\`）并切换算力引擎

仅在需要 **中英文自然语言文搜图（Chinese-CLIP）** 或 **离线语音转字幕（Whisper）** 时安装，不装不影响主程序：

1. 打开 **「设置 → 计算引擎 → 共享运行包」**，导入下载好的 \`.hyruntime\` 文件并点击启用（导入一次，本机所有仓库共用）；
2. 在同一页面的 **「本库覆盖」** 中，为对应能力选定想用的引擎（如给语音转写选定 \`speech-whisper\`、给视觉特征选定 \`embed-clip\`），保存并重载仓库即可。

${picLang('guide-runtime', 'zh', '左：导入并启用共享运行包；右：在计算引擎的本库覆盖中为能力选定提供方')}

### 3. 导入独立主题包（\`.hytheme\`）与微调外观

1. 打开 **「设置 → 外观与主题」**，点击 **「安装主题包…」** 选择 \`.hytheme\` 文件；
2. 点击已安装主题卡片即可切换，并可在当前仓库自由调整昼夜模式、强调色、密度、圆角与壁纸，各仓库互不干扰。

${picLang('guide-theme', 'zh', '在活页外观设置中选择主题并微调强调色、密度与圆角')}

> **安全提示**：\`.hytheme\` 为纯声明式零执行权限；\`.hyplugin\` / \`.hysuite\` / \`.hyruntime\` 属于本地可信扩展，请仅从官方 Release 或信任来源下载，并用 \`SHA256SUMS.txt\` 核对完整性。

---

## 场景套件（${suites.length} 套）

| 套件 | 场景 | 平台 | 内置预设 | 体积 | 下载 |
| :--- | :--- | :--- | :--- | ---: | :--- |
${suites.map((s) => `| **${s.titleZh}**<br/>\`${s.id}\` | ${s.tagZh} | ${s.platform === 'cross-platform' ? '全平台' : '仅 macOS'} | ${s.presets.map((p) => p.titleZh.split('·')[0].trim()).join(' / ')} | ${fmtSize(s.bytes)} | [下载 .hysuite](${s.downloadUrl}) |`).join('\n')}

<details>
<summary>展开查看 8 套套件的完整说明与平台备注</summary>

${suites.map((s) => `- **${s.titleZh}** (\`${s.id}\` · v${s.version} · 含 ${s.packageCount} 个插件)：${s.descZh}（${s.platformNoteZh}）`).join('\n')}

</details>

---

## 离线共享运行包（${runtimes.length} 个）

| 运行包 | 目标平台 | 配套套件 / 插件 | 体积 | 下载 |
| :--- | :--- | :--- | ---: | :--- |
${runtimes.map((r) => `| **${r.nameZh}**<br/>\`${r.assetName}\` | ${r.platformLabelZh} | ${r.usedBy.map((u) => `\`${u}\``).join(' ')} | ${fmtSize(r.bytes)} | [下载 .hyruntime](${r.downloadUrl}) |`).join('\n')}

${runtimes.map((r) => `- **${r.nameZh}**：${r.summaryZh}`).join('\n')}

---

## 独立主题（${themes.length} 套）

| 主题 | 模式 | 体积 | 说明 | 下载 |
| :--- | :--- | ---: | :--- | :--- |
${themes.map((t) => `| **${t.nameZh}**<br/>\`${t.assetName}\` | ${t.dualMode ? '昼夜双模' : '单模'} | ${fmtSize(t.bytes)} | ${t.descZh} | [下载 .hytheme](${t.downloadUrl}) |`).join('\n')}

> 另：活页主程序已内置 **活页·标准 / 银盐画册 / 青瓷书房 / 紧凑资料台** 4 套昼夜主题，并在主仓 \`host/examples/themes/\` 随附 **蓝晒（cyanotype）** 与 **银杏·秋光（ginkgo）** 2 套示例主题。

---

## 单装插件（${plugins.length} 个，已打包为合集）

> 若已安装上面的场景套件，无需重复下载对应单装插件。需要按需单装或自由拼装时，下载单装插件合集包 **[${pluginsBundle.assetName}](${pluginsBundle.downloadUrl})**（${fmtSize(pluginsBundle.bytes)}，解压后含以下全部 ${plugins.length} 个 \`.hyplugin\`，可在设置中多选安装）：

| 插件 | 包内文件 | 分类 | 平台 | 体积 | 简介 |
| :--- | :--- | :--- | :--- | ---: | :--- |
${plugins.map((p) => `| **${p.titleZh}** | \`${p.assetName}\` | ${catZh[p.category] || p.category} | ${p.platform === 'cross-platform' ? '全平台' : '仅 macOS'} | ${fmtSize(p.bytes)} | ${p.descZh} |`).join('\n')}

---

## 校验下载文件

下载完成后，可使用同版 \`SHA256SUMS.txt\` 校验完整性：

\`\`\`bash
# macOS / Linux
shasum -a 256 -c SHA256SUMS.txt --ignore-missing

# Windows PowerShell
Get-FileHash .\\atelier-studio-${releaseVersion}.hysuite -Algorithm SHA256
\`\`\`

---

## 协议与反馈

- 扩展插件与脚本源码遵循 Apache-2.0 许可；各运行包内的原生推理引擎与模型权重遵循其各自上游开源许可（随包附带 \`licenses/\`）。
- 遇到安装、兼容性或使用问题，欢迎到 [活页主仓库 Issues](https://github.com/XinXingNOVA/huoye/issues) 反馈，或访问 [huoye.org](https://huoye.org)。
`

const readmeEn = `<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/huoye-lockup-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/huoye-lockup-light.svg" />
  <img alt="Huoye Official Extensions" src="docs/assets/huoye-lockup-light.svg" height="60" />
</picture>

**Huoye Official Extensions · \`huoye-extensions\`**

[简体中文](README.md) | English · [Huoye Core Repo](https://github.com/XinXingNOVA/huoye) · [Web Catalog](https://huoye.org/en/catalog) · [Download ${releaseTag}](${repoUrl}/releases/tag/${releaseTag})

[![Version](https://img.shields.io/badge/Extensions-${releaseTag}-14B8A6.svg)](${repoUrl}/releases/tag/${releaseTag})
[![Host](https://img.shields.io/badge/Requires-Huoye%20v0.3.0%2B-38BDF8.svg)](https://github.com/XinXingNOVA/huoye/releases)
[![License](https://img.shields.io/badge/License-Apache--2.0-64748B.svg)](https://github.com/XinXingNOVA/huoye/blob/main/LICENSE)

[Install Guide](#how-to-install-in-3-minutes) · [8 Suites](#suites-8) · [Runtimes](#shared-runtimes-2) · [Themes](#themes-1) · [38 Plugins](#standalone-plugins-38)

</div>

---

${picLang('preview-suites', 'en', 'Four Huoye workspaces powered by official extensions: Document Desk, Reference Board, Celadon Study, and Offline Transcription')}

Official extension releases for **Huoye**, versioned independently from the core app (current release \`${releaseTag}\`):

- **${suites.length} Suites (\`.hysuite\`)** — curated plugin bundles with ready-to-use split layouts (**recommended starting point**);
- **${runtimes.length} Shared Runtimes (\`.hyruntime\`)** — offline native models and runners imported once and shared across libraries;
- **${themes.length} Standalone Theme (\`.hytheme\`)** — pure declarative styling (4 built-in themes plus Cyanotype & Ginkgo Autumn examples ship with the core repo);
- **${plugins.length} Standalone Plugins (\`.hyplugin\`)** — install individually to customize any library.

> All files are published under [Releases (${releaseTag})](${repoUrl}/releases/tag/${releaseTag}) with [\`SHA256SUMS.txt\`](${repoUrl}/releases/download/${releaseTag}/SHA256SUMS.txt).

---

## How to Install in 3 Minutes

Huoye separates **installing on your machine** from **enabling inside a library**: installed packs stay light and never clutter other libraries, and disabling or removing a plugin never erases your data.

### 1. Suites (\`.hysuite\`) & Plugins (\`.hyplugin\`)

1. Open **Settings → Suites & Plugins** (or drop a suite onto the Start page) and choose **Install Suite or Plugin…** (or drag the \`.hysuite\` / \`.hyplugin\` file in);
2. Review the preview and confirm installation;
3. Open your target library → **Settings → Features & Presets**, toggle the plugins (or apply a suite preset), and click **Apply & Reload**.

${picLang('guide-plugins', 'en', 'Enabling a plugin inside Huoye library settings')}

### 2. Shared Runtimes (\`.hyruntime\`) & Compute Engines

Only needed for **offline bilingual text-to-image search (Chinese-CLIP)** or **offline speech transcription (Whisper)**:

1. Open **Settings → Compute Engines → Shared Runtimes**, import the \`.hyruntime\` archive, and enable it once for all libraries;
2. Under **Library Overrides** on the same page, pick your preferred provider (e.g. \`speech-whisper\` or \`embed-clip\`) and reload the library.

${picLang('guide-runtime', 'en', 'Left: importing a shared runtime; Right: assigning a provider under Library Overrides')}

### 3. Themes (\`.hytheme\`) & Per-Library Appearance

1. Open **Settings → Appearance → Themes** and click **Install Theme…** to import a \`.hytheme\` file;
2. Select the theme card and optionally tune day/night mode, accent color, density, corners, and wallpaper per library.

${picLang('guide-theme', 'en', 'Customizing theme accent color, density, and corner radius per library')}

> **Trust note**: \`.hytheme\` packs are purely declarative with no code execution; \`.hyplugin\`, \`.hysuite\`, and \`.hyruntime\` packages are trusted local extensions without a malicious-code sandbox — install only from official Releases or trusted sources and verify \`SHA256SUMS.txt\`.

---

## Suites (${suites.length})

| Suite | Focus | Platform | Presets | Size | Download |
| :--- | :--- | :--- | :--- | ---: | :--- |
${suites.map((s) => `| **${s.titleEn}**<br/>\`${s.id}\` | ${s.tagEn} | ${s.platform === 'cross-platform' ? 'Cross-platform' : 'macOS only'} | ${s.presets.map((p) => p.titleEn.split('·')[0].trim()).join(' / ')} | ${fmtSize(s.bytes)} | [Download .hysuite](${s.downloadUrl}) |`).join('\n')}

<details>
<summary>Full suite descriptions & platform notes</summary>

${suites.map((s) => `- **${s.titleEn}** (\`${s.id}\` · v${s.version} · ${s.packageCount} plugins): ${s.descEn} *(${s.platformNoteEn})*`).join('\n')}

</details>

---

## Shared Runtimes (${runtimes.length})

| Runtime | Target | Pairs With | Size | Download |
| :--- | :--- | :--- | ---: | :--- |
${runtimes.map((r) => `| **${r.nameEn}**<br/>\`${r.assetName}\` | ${r.platformLabelEn} | ${r.usedBy.map((u) => `\`${u}\``).join(' ')} | ${fmtSize(r.bytes)} | [Download .hyruntime](${r.downloadUrl}) |`).join('\n')}

${runtimes.map((r) => `- **${r.nameEn}**: ${r.summaryEn}`).join('\n')}

---

## Themes (${themes.length})

| Theme | Mode | Size | Summary | Download |
| :--- | :--- | ---: | :--- | :--- |
${themes.map((t) => `| **${t.nameEn}**<br/>\`${t.assetName}\` | ${t.dualMode ? 'Day & Night' : 'Single'} | ${fmtSize(t.bytes)} | ${t.descEn} | [Download .hytheme](${t.downloadUrl}) |`).join('\n')}

> Note: Huoye also includes 4 built-in day/night themes plus **Cyanotype** and **Ginkgo Autumn** example packs in the core repo under \`host/examples/themes/\`.

---

## Standalone Plugins (${plugins.length}, bundled in one archive)

> If you already installed a Suite above, its plugins are bundled automatically. For individual mix-and-match installs, download **[${pluginsBundle.assetName}](${pluginsBundle.downloadUrl})** (${fmtSize(pluginsBundle.bytes)}, unpacks to all ${plugins.length} \`.hyplugin\` packages):

| Plugin | File inside ZIP | Category | Platform | Size | Summary |
| :--- | :--- | :--- | :--- | ---: | :--- |
${plugins.map((p) => `| **${p.titleEn}** | \`${p.assetName}\` | ${catEn[p.category] || p.category} | ${p.platform === 'cross-platform' ? 'Cross-platform' : 'macOS only'} | ${fmtSize(p.bytes)} | ${p.descEn} |`).join('\n')}

---

## Verify Checksums

\`\`\`bash
# macOS / Linux
shasum -a 256 -c SHA256SUMS.txt --ignore-missing

# Windows PowerShell
Get-FileHash .\\atelier-studio-${releaseVersion}.hysuite -Algorithm SHA256
\`\`\`

---

## License & Feedback

- Extension plugin code and build scripts are licensed under Apache-2.0. Native runners and model weights inside \`.hyruntime\` archives retain their upstream licenses (bundled under \`licenses/\`).
- Report bugs or requests in [Huoye Core Issues](https://github.com/XinXingNOVA/huoye/issues) or visit [huoye.org](https://huoye.org/en/).
`

writeFileSync(join(extRoot, 'README.md'), readmeZh)
writeFileSync(join(extRoot, 'README.en.md'), readmeEn)
console.log(`✅ Rendered illustrated README.md & README.en.md for huoye-extensions (${releaseTag})`)
