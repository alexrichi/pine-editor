import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import {
  applyPineTheme,
  registerPineLanguage,
  schedulePineLint,
  syncContextViewTheme,
  type PineEditorTheme,
} from './pine';
import { pineDefinitionRange } from './pineFeatures';

const FONT_FAMILY =
  "'Geist Mono Variable', 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

interface Props {
  value: string;
  /** The Pine tab whose buffer the editor shows. */
  tabId: string;
  /** Open Pine tabs; models of removed tabs are disposed. */
  tabIds: readonly string[];
  theme: PineEditorTheme;
  onChange: (value: string) => void;
  onSave?: () => void;
  onRun?: () => void;
  onDiscardChanges?: () => void;
  onNewTab?: () => void;
  onOpenScript?: () => void;
  onToggleConsole?: () => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

interface Session {
  editor: monaco.editor.IStandaloneCodeEditor;
  models: Map<string, monaco.editor.ITextModel>;
  views: Map<string, monaco.editor.ICodeEditorViewState | null>;
  cleanups: Map<string, () => void>;
  activeId: string;
  activate: (id: string, source: string) => void;
  dispose: (id: string) => void;
  disposeAll: () => void;
}

export function PineEditor({
  value,
  tabId,
  tabIds,
  theme,
  onChange,
  onSave,
  onRun,
  onDiscardChanges,
  onNewTab,
  onOpenScript,
  onToggleConsole,
  autoFocus,
  className,
  placeholder,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const callbacks = useRef({
    onChange,
    onSave,
    onRun,
    onDiscardChanges,
    onNewTab,
    onOpenScript,
    onToggleConsole,
  });
  callbacks.current = {
    onChange,
    onSave,
    onRun,
    onDiscardChanges,
    onNewTab,
    onOpenScript,
    onToggleConsole,
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    registerPineLanguage();
    applyPineTheme(theme);

    const models = new Map<string, monaco.editor.ITextModel>();
    const views = new Map<string, monaco.editor.ICodeEditorViewState | null>();
    const cleanups = new Map<string, () => void>();

    const ensure = (id: string, source: string): monaco.editor.ITextModel => {
      const existing = models.get(id);
      if (existing) return existing;
      const model = monaco.editor.createModel(source, 'pine');
      models.set(id, model);
      const change = model.onDidChangeContent(() => {
        if (sessionRef.current?.editor.getModel() === model) {
          callbacks.current.onChange(model.getValue());
        }
      });
      const stopLint = schedulePineLint(model);
      cleanups.set(id, () => {
        change.dispose();
        stopLint();
      });
      return model;
    };

    const editor = monaco.editor.create(host, {
      model: ensure(tabId, value),
      theme: 'pine',
      automaticLayout: true,
      fontFamily: FONT_FAMILY,
      fontSize: 12,
      lineHeight: 19,
      fontLigatures: false,
      wordWrap: 'on',
      wrappingIndent: 'same',
      tabSize: 4,
      insertSpaces: true,
      detectIndentation: false,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      renderLineHighlight: 'all',
      renderWhitespace: 'none',
      glyphMargin: false,
      folding: true,
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 8,
      minimap: {
        enabled: true,
        showSlider: 'mouseover',
        renderCharacters: false,
        maxColumn: 80,
      },
      stickyScroll: { enabled: true },
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true, highlightActiveBracketPair: true },
      matchBrackets: 'always',
      autoClosingBrackets: 'languageDefined',
      autoIndent: 'full',
      'semanticHighlighting.enabled': true,
      quickSuggestions: { other: true, comments: false, strings: false },
      fixedOverflowWidgets: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      ariaLabel: 'Pine script',
      placeholder,
    });

    const session: Session = {
      editor,
      models,
      views,
      cleanups,
      activeId: tabId,
      activate(id, source) {
        if (this.activeId !== id) {
          this.views.set(this.activeId, this.editor.saveViewState());
        }
        const next = ensure(id, source);
        if (this.editor.getModel() !== next) this.editor.setModel(next);
        if (next.getValue() !== source) {
          // Keep the tab's undo stack for external edits such as AI patches.
          next.pushEditOperations(
            [],
            [{ range: next.getFullModelRange(), text: source }],
            () => null,
          );
        }
        this.activeId = id;
        const view = this.views.get(id);
        if (view) this.editor.restoreViewState(view);
      },
      dispose(id) {
        if (this.activeId === id) return;
        const model = this.models.get(id);
        if (!model) return;
        this.cleanups.get(id)?.();
        this.cleanups.delete(id);
        this.models.delete(id);
        this.views.delete(id);
        model.dispose();
      },
      disposeAll() {
        for (const id of [...this.models.keys()]) {
          this.cleanups.get(id)?.();
          this.models.get(id)?.dispose();
        }
        this.cleanups.clear();
        this.models.clear();
        this.views.clear();
      },
    };
    sessionRef.current = session;
    syncContextViewTheme(host);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      callbacks.current.onRun?.();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      void editor.getAction('editor.action.quickCommand')?.run();
    });
    editor.addAction({
      id: 'pine.save',
      label: 'Save script',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      contextMenuGroupId: 'p_session',
      contextMenuOrder: 3,
      run: () => callbacks.current.onSave?.(),
    });
    editor.addAction({
      id: 'pine.definition',
      label: 'Go to Definition',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.F12],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      run: (instance) => {
        const model = instance.getModel();
        const position = instance.getPosition();
        const range = model && position ? pineDefinitionRange(model, position) : null;
        if (range) {
          instance.setPosition(range.getStartPosition());
          instance.revealPositionInCenter(range.getStartPosition());
          instance.focus();
          return;
        }
        void instance.getAction('editor.action.revealDefinition')?.run();
      },
    });
    editor.addAction({
      id: 'pine.discard',
      label: 'Discard all changes',
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 50,
      run: () => callbacks.current.onDiscardChanges?.(),
    });
    editor.addAction({
      id: 'pine.find',
      label: 'Find/Replace',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 40,
      run: (instance) => {
        void instance.getAction('editor.action.startFindReplaceAction')?.run();
      },
    });
    editor.addAction({
      id: 'pine.newTab',
      label: 'New tab',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyT],
      contextMenuGroupId: 'p_session',
      contextMenuOrder: 1,
      run: () => callbacks.current.onNewTab?.(),
    });
    editor.addAction({
      id: 'pine.openScript',
      label: 'Open script',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO],
      contextMenuGroupId: 'p_session',
      contextMenuOrder: 2,
      run: () => callbacks.current.onOpenScript?.(),
    });
    editor.addAction({
      id: 'pine.console',
      label: 'Toggle console',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote],
      contextMenuGroupId: 'q_console',
      contextMenuOrder: 1,
      run: () => callbacks.current.onToggleConsole?.(),
    });

    if (autoFocus) editor.focus();
    let disposed = false;
    // The font may arrive after the editor measured its first frame.
    void document.fonts?.ready.then(() => {
      if (!disposed) editor.layout();
    });

    return () => {
      disposed = true;
      sessionRef.current = null;
      editor.dispose();
      session.disposeAll();
    };
    // The editor is created once; tabs, values and themes are applied below.
  }, []);

  useEffect(() => {
    sessionRef.current?.activate(tabId, value);
  }, [tabId, value]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;
    const open = new Set(tabIds);
    for (const id of [...session.models.keys()]) {
      if (!open.has(id)) session.dispose(id);
    }
  }, [tabIds]);

  useEffect(() => {
    const host = hostRef.current;
    if (!sessionRef.current || !host) return;
    // The theme provider applies the root class in a layout effect, so reading
    // the computed tokens here sees the new palette.
    applyPineTheme(theme);
    syncContextViewTheme(host);
  }, [theme]);

  return (
    <div
      className={`min-h-0 overflow-hidden rounded-md border border-border${
        className ? ` ${className}` : ''
      }`}
    >
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
