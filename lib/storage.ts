import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { menuId, type Language, type PublishedMenu } from "./menu";

const root = join(process.cwd(), ".data", "menus");

export async function storeMenu(menu: PublishedMenu, files: Map<Language, Buffer>) {
  await mkdir(root, { recursive: true });
  const draft = await mkdtemp(join(root, ".draft-"));
  const id = randomUUID().replaceAll("-", "");
  try {
    for (const [language, file] of files) await writeFile(join(draft, `${language}.webp`), file);
    await writeFile(join(draft, "menu.json"), JSON.stringify(menu));
    await rename(draft, join(root, id));
  } catch (error) {
    await rm(draft, { recursive: true, force: true });
    throw error;
  }
  return id;
}

export async function getMenu(id: string): Promise<PublishedMenu | null> {
  if (!menuId.test(id)) return null;
  try {
    return JSON.parse(await readFile(join(root, id, "menu.json"), "utf8")) as PublishedMenu;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function readMenuImage(id: string, language: Language) {
  return readFile(join(root, id, `${language}.webp`));
}
