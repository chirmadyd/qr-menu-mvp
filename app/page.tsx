import { QrCode, ScanLine } from "lucide-react";
import Link from "next/link";
import { MenuEditor } from "./menu-editor";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="shell topbar">
          <Link className="brand" href="/" aria-label="메뉴링크 홈"><span><ScanLine size={20} /></span>메뉴링크</Link>
          <div className="topbar-label">다국어 QR 메뉴 편집기</div>
        </div>
      </header>
      <main className="shell home">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-content">
            <h1 id="hero-title">우리 가게 메뉴를<br />다국어 QR 메뉴로</h1>
            <p>메뉴판을 올리고 번역문을 확인한 뒤, QR 링크로 공유하세요.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-sheet"><span>MENU</span><i /><i /><i /><i /></div>
            <div className="art-qr"><QrCode size={61} strokeWidth={1.55} /></div>
          </div>
        </section>
        <MenuEditor />
      </main>
    </>
  );
}
