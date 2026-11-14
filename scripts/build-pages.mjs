import { spawnSync } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const basePath = process.env.PAGES_BASE_PATH ?? "/QR-TransLate-Menu";
const configuredApi = process.env.NEXT_PUBLIC_MENU_API_ORIGIN?.trim();
const api = configuredApi ? new URL(configuredApi) : undefined;
if (api && (api.protocol !== "https:" || api.href !== `${api.origin}/`)) {
  throw new Error("NEXT_PUBLIC_MENU_API_ORIGIN에는 경로가 없는 HTTPS 서버 주소를 입력하세요.");
}
if (basePath && !/^\/(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/.test(basePath)) {
  throw new Error("PAGES_BASE_PATH에는 슬래시로 시작하는 저장소 경로를 입력하세요.");
}

// Only the editor and its browser dependencies are part of the Pages build.
const entries = [
  "package.json", "tsconfig.json",
  "app/layout.tsx", "app/page.tsx", "app/menu-editor.tsx", "app/globals.css",
  "lib/menu.ts", "lib/canvas.ts", "lib/restore-text.ts",
];
const staging = await mkdtemp(join(root, ".pages-build-"));
if (dirname(await realpath(staging)) !== root) throw new Error("정적 빌드 폴더 경로를 확인해 주세요.");
try {
  for (const entry of entries) {
    const destination = join(staging, entry);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(root, entry), destination);
  }
  await writeFile(join(staging, "next.config.mjs"), `export default ${JSON.stringify({ output: "export", basePath, trailingSlash: true })};\n`);
  const build = spawnSync(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), "build", "--webpack"], {
    cwd: staging,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_PAGES_BUILD: "1", NEXT_PUBLIC_MENU_API_ORIGIN: api?.origin ?? "" },
  });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error("GitHub Pages 정적 빌드에 실패했습니다.");
  const exported = join(staging, "out");
  await writeFile(join(exported, ".nojekyll"), "");
  // Keep the previous export until the new build has succeeded.
  const output = join(root, "out");
  const existing = await lstat(output).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink() || await realpath(output) !== output)) {
    throw new Error("기존 out 경로가 작업 폴더의 일반 디렉터리인지 확인해 주세요.");
  }
  await rm(output, { recursive: true, force: true });
  await rename(exported, output);
} finally {
  await rm(staging, { recursive: true, force: true });
}
