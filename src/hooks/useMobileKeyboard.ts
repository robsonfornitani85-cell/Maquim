import { useEffect, useState } from 'react';

/**
 * Comportamento global de teclado para uso no celular:
 *  - Ao focar um campo, rola a tela para deixá-lo no centro da área visível
 *    (acima do teclado virtual), inclusive quando o teclado termina de abrir.
 *  - "Enter"/"Próximo" do teclado do celular pula para o próximo campo.
 *  - Mantém a variável CSS --kb-height com a altura do teclado, usada para dar
 *    espaço extra no fim da página e o último campo nunca ficar escondido.
 */
export function useMobileKeyboard() {
  useEffect(() => {
    const isEditable = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
      if (!el) return false;
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
      if (el instanceof HTMLInputElement) {
        const t = el.type;
        return !el.readOnly && !['button', 'submit', 'checkbox', 'radio', 'file', 'range', 'color'].includes(t);
      }
      return false;
    };

    const scrollFocusedIntoView = () => {
      const el = document.activeElement;
      if (!isEditable(el)) return;
      const vv = window.visualViewport;
      const rect = el.getBoundingClientRect();
      const visibleTop = vv ? vv.offsetTop : 0;
      const visibleHeight = vv ? vv.height : window.innerHeight;
      // Já está confortavelmente visível? (com margem para o rótulo acima do campo)
      if (rect.top >= visibleTop + 90 && rect.bottom <= visibleTop + visibleHeight - 24) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    let focusTimer: number | undefined;
    const onFocusIn = (e: FocusEvent) => {
      if (!isEditable(e.target as Element)) return;
      window.clearTimeout(focusTimer);
      // Espera o teclado começar a abrir
      focusTimer = window.setTimeout(scrollFocusedIntoView, 320);
    };

    const updateKbHeight = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-height', `${Math.round(kb)}px`);
      document.documentElement.classList.toggle('teclado-aberto', kb > 120);
    };

    let resizeTimer: number | undefined;
    const onViewportResize = () => {
      updateKbHeight();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scrollFocusedIntoView, 80);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const el = e.target as HTMLElement;
      if (!(el instanceof HTMLInputElement) || !isEditable(el)) return;
      if (el.dataset.enterAction === 'custom') return; // campo trata o Enter sozinho
      e.preventDefault();
      const fields = Array.from(
        document.querySelectorAll<HTMLElement>('input, textarea, select')
      ).filter((f) => isEditable(f) && !(f as HTMLInputElement).disabled && f.offsetParent !== null && f.tabIndex !== -1);
      const idx = fields.indexOf(el);
      const next = fields[idx + 1];
      if (next) next.focus();
      else el.blur(); // último campo: fecha o teclado
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    window.visualViewport?.addEventListener('resize', onViewportResize);
    updateKbHeight();
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
      window.clearTimeout(focusTimer);
      window.clearTimeout(resizeTimer);
    };
  }, []);
}

/** Estado de conexão com a internet. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
