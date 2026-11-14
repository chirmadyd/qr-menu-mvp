export const languages = [
  { code: "en", label: "영어", native: "English", html: "en" },
  { code: "ja", label: "일본어", native: "日本語", html: "ja" },
  { code: "zh-CN", label: "중국어 (간체)", native: "简体中文", html: "zh-CN" },
] as const;

export type Language = (typeof languages)[number]["code"];

export type MenuLine = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  backgroundMode?: "restore" | "fill";
  background: string;
  backgroundTransparency?: number;
  color: string;
  translations: Partial<Record<Language, string>>;
};

export type MenuImage = { url: string; name: string; width: number; height: number };
export type PublishedMenu = { title: string; languages: Language[] };

export const maxUpload = 8 * 1024 * 1024;
export const maxImageSide = 2560;
export const menuId = /^[a-f0-9]{32}$/;

export function isLanguage(value: unknown): value is Language {
  return languages.some(({ code }) => code === value);
}

export function newLine(
  id: string,
  text: string,
  box: Pick<MenuLine, "x" | "y" | "width" | "height">,
): MenuLine {
  return {
    id,
    text,
    ...box,
    fontSize: Math.max(10, Math.round(box.height * 0.72)),
    background: "#ffffff",
    color: "#202020",
    translations: {},
  };
}
